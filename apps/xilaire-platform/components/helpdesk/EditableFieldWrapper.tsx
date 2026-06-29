"use client";

import {
  EditableSelect,
  EditableInput,
  EditableTextArea,
} from "@/components/helpdesk/EditableField";

// Allows passing event handlers safely inside server components
export function FieldSelect(props: any) {
  return <EditableSelect {...props} />;
}

export function FieldInput(props: any) {
  return <EditableInput {...props} />;
}

export function FieldTextArea(props: any) {
  return <EditableTextArea {...props} />;
}
