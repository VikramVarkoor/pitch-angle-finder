export interface PitchAngle {
  headline: string;
  angle: string;
  why_it_works: string;
  newsworthy_hook: string;
  target_beat: string;
}

export interface PitchResponse {
  angles: PitchAngle[];
}

export interface ApiErrorBody {
  detail?: string;
}
