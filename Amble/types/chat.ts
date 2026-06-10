import { Restaurant } from "./restaurant";
import { BookingContext } from "./booking";

export interface QuickReply {
  id?: string;
  text: string;
  value: string;
}

export interface TableCard {
  tableId: string;
  tableName: string;
  tableType: string;
  tableImage: string;
  tableImages: string[];
  features: string[];
  description: string;
  capacity: { min: number; max: number };
  deposit: number;
  isAvailable: boolean;
  restaurantId: string;
  restaurantName: string;
  restaurantImage: string;
  restaurantCity: string;
  restaurantCuisine: string;
  restaurantRating: number;
  restaurantAddress: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: "user" | "ai";
  timestamp: Date;

  // Restaurant search results
  restaurants?: Restaurant[];

  // Booking flow — table cards
  tableCards?: TableCard[];

  // Booking context (date/time/partySize/etc filled so far)
  bookingContext?: Partial<BookingContext>;

  // Quick reply chips
  quickReplies?: QuickReply[];

  // Session tracking (compat)
  sessionId?: string;
}