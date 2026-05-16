export type CameraMode = 'orbit' | 'top' | 'first';

export type SelectionKind = 'furniture' | 'room' | 'lighting';

export interface Selection {
  kind: SelectionKind;
  id: string;
}
