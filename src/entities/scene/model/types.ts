export type CameraMode = 'orbit' | 'top';

export type SelectionKind = 'furniture' | 'room';

export interface Selection {
  kind: SelectionKind;
  id: string;
}
