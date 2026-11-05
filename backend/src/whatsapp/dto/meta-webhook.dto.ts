export interface MetaWebhookEntryChangeValueMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: {
    body: string;
  };
  image?: {
    id: string;
    mime_type: string;
    sha256: string;
    caption?: string;
  };
  audio?: {
    id: string;
    mime_type: string;
  };
  document?: {
    id: string;
    mime_type: string;
    filename?: string;
    caption?: string;
  };
  video?: {
    id: string;
    mime_type: string;
    caption?: string;
  };
  sticker?: {
    id: string;
    mime_type: string;
  };
  interactive?: {
    type: string;
    button_reply?: {
      id: string;
      title: string;
    };
    list_reply?: {
      id: string;
      title: string;
      description?: string;
    };
  };
  context?: {
    id?: string;
    from?: string;
  };
}

export interface MetaWebhookEntryChangeValueStatus {
  id: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{
    code: number;
    title: string;
    message?: string;
    error_data?: {
      details: string;
    };
  }>;
}

export interface MetaWebhookEntryChangeValueContact {
  profile: {
    name: string;
  };
  wa_id: string;
}

export interface MetaWebhookEntryChangeValue {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: MetaWebhookEntryChangeValueContact[];
  messages?: MetaWebhookEntryChangeValueMessage[];
  statuses?: MetaWebhookEntryChangeValueStatus[];
}

export interface MetaWebhookEntryChange {
  field: string;
  value: MetaWebhookEntryChangeValue;
}

export interface MetaWebhookEntry {
  id: string;
  changes: MetaWebhookEntryChange[];
}

export interface MetaWebhookPayload {
  object: string;
  entry: MetaWebhookEntry[];
}
