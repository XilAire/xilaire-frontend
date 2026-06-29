import { supabasePlatform } from "@/lib/supabasePlatformClient";

/**
 * Main Automation Runner
 */
export async function runAutomation(automation: any, payload: any) {
  try {
    const config = automation.config_json || {
      triggers: [],
      conditions: [],
      actions: [],
    };

    // --- 1. Evaluate Conditions ---
    const conditionsPassed = evaluateConditions(config.conditions, payload);

    if (!conditionsPassed) {
      await logRun(automation.id, "skipped", { reason: "Conditions not met" }, payload);
      return { skipped: true, reason: "Conditions not met" };
    }

    // --- 2. Execute Actions ---
    const results: any = {};

    for (const action of config.actions) {
      try {
        results[action.id] = await executeAction(action, payload);
      } catch (actionError: any) {
        // Log partial failure & return
        await logRun(
          automation.id,
          "failed",
          {
            error: actionError.message,
            failedAction: action,
            partialResults: results,
          },
          payload
        );

        return {
          error: actionError.message,
          failedAction: action.id,
          partialResults: results,
        };
      }
    }

    // --- 3. Log Success ---
    await logRun(automation.id, "success", results, payload);

    return results;

  } catch (err: any) {
    // Auto catch any unexpected runtime error
    await logRun(automation.id, "failed", { error: err.message }, payload);

    return { error: err.message };
  }
}

/**
 * Condition Evaluator
 */
function evaluateConditions(conditions: any[], payload: any) {
  for (const cond of conditions) {
    const fieldValue = payload[cond.params.field];

    switch (cond.type) {
      case "equals":
        if (fieldValue !== cond.params.value) return false;
        break;

      case "contains":
        if (!fieldValue || !String(fieldValue).includes(cond.params.value)) return false;
        break;

      case "numeric_compare":
        const left = Number(fieldValue);
        const right = Number(cond.params.value);
        const op = cond.params.operator; // ">", "<", ">=", "<="

        if (!compareNumbers(left, right, op)) return false;
        break;
    }
  }
  return true;
}

/**
 * Safe numeric comparison (replaces eval)
 */
function compareNumbers(left: number, right: number, op: string) {
  switch (op) {
    case ">": return left > right;
    case "<": return left < right;
    case ">=": return left >= right;
    case "<=": return left <= right;
    case "==": return left == right;
    case "!=": return left != right;
    default: return false;
  }
}

/**
 * Execute an individual action
 */
async function executeAction(action: any, payload: any) {
  switch (action.type) {
    case "send_email":
      return await sendEmailAction(action.params, payload);

    case "http_request":
      return await httpRequestAction(action.params, payload);

    case "update_record":
      return await updateRecordAction(action.params, payload);

    case "notify_bot":
      return await notifyBotAction(action.params, payload);

    default:
      throw new Error(`Unknown action type: ${action.type}`);
  }
}

/** ------------------------------------
 *  ACTION HANDLERS
 * -----------------------------------*/

// Email Action
async function sendEmailAction(params: any, payload: any) {
  // TODO: hook into SendGrid/Azure/etc.
  return { sent: true, to: params.to };
}

// HTTP Action
async function httpRequestAction(params: any, payload: any) {
  const res = await fetch(params.url, {
    method: params.method || "POST",
    headers: params.headers || {},
    body: JSON.stringify(params.body || payload),
  });

  return await res.json();
}

// DB Action Example
async function updateRecordAction(params: any, payload: any) {
  // params.table, params.data, params.match
  return { updated: true, table: params.table };
}

// Bot Notification
async function notifyBotAction(params: any, payload: any) {
  // TODO: Send bot event to XilAire bot network
  return { notified: params.bot, payload };
}

/**
 * Logs automation execution to database
 */
async function logRun(
  automationId: string,
  status: string,
  details: any,
  payload: any
) {
  await supabasePlatform.from("automation_logs").insert({
    automation_id: automationId,
    status,
    details,
    payload,
  });
}
