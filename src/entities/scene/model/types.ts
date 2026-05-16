export type CameraMode = 'orbit' | 'top' | 'first';

export type SelectionKind = 'furniture' | 'room';

export interface Selection {
  kind: SelectionKind;
  id: string;
}
