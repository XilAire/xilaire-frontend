// apps/xilaire-platform/app/(app)/automations/[slug]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabasePlatform } from "@/lib/supabasePlatformClient";

export default function AutomationDetailPage() {
  const { slug } = useParams();
  const [automation, setAutomation] = useState<any>(null);
  const [config, setConfig] = useState<any>({
    triggers: [],
    conditions: [],
    actions: [],
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAutomation();
  }, []);

  async function loadAutomation() {
    const { data, error } = await supabasePlatform
      .from("automations")
      .select("*")
      .eq("slug", slug)
      .single();

    if (error || !data) return;

    setAutomation(data);
    setConfig(data.config_json || { triggers: [], conditions: [], actions: [] });
  }

  async function saveConfig() {
    setSaving(true);

    const { error } = await supabasePlatform
      .from("automations")
      .update({ config_json: config })
      .eq("id", automation.id);

    setSaving(false);
    if (error) alert("Error saving config");
    else alert("Saved!");
  }

  function addTrigger() {
    setConfig((prev: any) => ({
      ...prev,
      triggers: [
        ...prev.triggers,
        { id: crypto.randomUUID(), type: "event", params: {} },
      ],
    }));
  }

  function addCondition() {
    setConfig((prev: any) => ({
      ...prev,
      conditions: [
        ...prev.conditions,
        { id: crypto.randomUUID(), type: "equals", params: {} },
      ],
    }));
  }

  function addAction() {
    setConfig((prev: any) => ({
      ...prev,
      actions: [
        ...prev.actions,
        { id: crypto.randomUUID(), type: "send_email", params: {} },
      ],
    }));
  }

  return (
    <div className="p-8 space-y-8">
      {automation && (
        <>
          <h1 className="text-3xl font-bold">{automation.name}</h1>
          <p className="text-gray-600">{automation.description}</p>

          {/* Triggers */}
          <section className="border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Triggers</h2>
              <button
                onClick={addTrigger}
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                + Add Trigger
              </button>
            </div>

            <div className="space-y-3">
              {config.triggers.map((tr: any) => (
                <div key={tr.id} className="border p-4 rounded">
                  <select
                    value={tr.type}
                    onChange={(e) => {
                      tr.type = e.target.value;
                      setConfig({ ...config });
                    }}
                    className="border rounded px-2 py-1"
                  >
                    <option value="event">Bot Event</option>
                    <option value="schedule">Schedule</option>
                    <option value="webhook">Webhook</option>
                  </select>

                  <textarea
                    placeholder="Trigger parameters (JSON)"
                    value={JSON.stringify(tr.params, null, 2)}
                    onChange={(e) => {
                      tr.params = JSON.parse(e.target.value || "{}");
                      setConfig({ ...config });
                    }}
                    className="w-full mt-2 p-2 border rounded font-mono text-sm"
                    rows={4}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Conditions */}
          <section className="border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Conditions</h2>
              <button
                onClick={addCondition}
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                + Add Condition
              </button>
            </div>

            <div className="space-y-3">
              {config.conditions.map((cond: any) => (
                <div key={cond.id} className="border p-4 rounded">
                  <select
                    value={cond.type}
                    onChange={(e) => {
                      cond.type = e.target.value;
                      setConfig({ ...config });
                    }}
                    className="border rounded px-2 py-1"
                  >
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                    <option value="numeric_compare">Numeric Compare</option>
                  </select>

                  <textarea
                    placeholder="Condition parameters (JSON)"
                    value={JSON.stringify(cond.params, null, 2)}
                    onChange={(e) => {
                      cond.params = JSON.parse(e.target.value || "{}");
                      setConfig({ ...config });
                    }}
                    className="w-full mt-2 p-2 border rounded font-mono text-sm"
                    rows={4}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Actions */}
          <section className="border rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Actions</h2>
              <button
                onClick={addAction}
                className="bg-blue-600 text-white px-3 py-1 rounded"
              >
                + Add Action
              </button>
            </div>

            <div className="space-y-3">
              {config.actions.map((act: any) => (
                <div key={act.id} className="border p-4 rounded">
                  <select
                    value={act.type}
                    onChange={(e) => {
                      act.type = e.target.value;
                      setConfig({ ...config });
                    }}
                    className="border rounded px-2 py-1"
                  >
                    <option value="send_email">Send Email</option>
                    <option value="http_request">HTTP Request</option>
                    <option value="update_record">Update Record</option>
                    <option value="notify_bot">Notify Bot</option>
                  </select>

                  <textarea
                    placeholder="Action parameters (JSON)"
                    value={JSON.stringify(act.params, null, 2)}
                    onChange={(e) => {
                      act.params = JSON.parse(e.target.value || "{}");
                      setConfig({ ...config });
                    }}
                    className="w-full mt-2 p-2 border rounded font-mono text-sm"
                    rows={4}
                  />
                </div>
              ))}
            </div>
          </section>

          {/* Save button */}
          <button
            onClick={saveConfig}
            disabled={saving}
            className="bg-green-600 text-white px-6 py-3 rounded-lg font-semibold"
          >
            {saving ? "Saving..." : "Save Automation"}
          </button>
        </>
      )}
    </div>
  );
}
