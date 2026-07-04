import type { MaterialFormCategory } from "./material-form-config";

export type MaterialTemplateDto = {
  /** Stable key within category (row index string). */
  id: string;
  name: string;
  buttonLabel?: string;
  category: MaterialFormCategory;
  materialGroup?: string;
  supplier?: string;
  unit: string;
  defaultIncrement?: number;
  price?: number;
  size?: string;
  color?: string;
  capType?: string;
  packagingType?: string;
};

export type MaterialTemplatesPayload = {
  suppliers: string[];
  templates: MaterialTemplateDto[];
  sources: {
    suppliers: "airtable/seeds/suppliers.csv";
    templates: "airtable/seeds/materials_packaging.csv";
  };
};
