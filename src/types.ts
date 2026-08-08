export interface Application {
  title: string;
  description: string;
  /** Optional version string, e.g. `0.0.1`. Entries without one show no version. */
  version?: string;
  /** Root-relative path of the application's icon image, e.g. `/icons/mail.svg`. */
  icon: string;
  /**
   * Where choosing this application takes the user — the application's own
   * entry point. Entries without one fall back to this app's detail page.
   */
  main?: string;
}

/** The list endpoint responds with a bare array, not a wrapper object. */
export type ApplicationsResponse = Application[];

export interface ApplicationResponse {
  application: Application;
}

export interface SetsResponse {
  sets: string[];
}

export interface AdminPresetResponse {
  activePreset: string;
  presets: string[];
}
