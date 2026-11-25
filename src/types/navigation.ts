export type Page =
  | "home"
  | "lab"
  | "management"
  | "challenge"
  | "history"
  | "world"
  | "book"
  | "tech"
  | "tree"
  | "museum"
  | "eras"
  | "achievements"
  | "settings";

export type ManagementTab =
  "orders" | "produce" | "equipment" | "market" | "overview";

export type BookSubMode = "collection" | "knowledge";

export interface MobileDetailBar {
  parentLabel: string;
  title?: string;
  onBack: () => void;
}
