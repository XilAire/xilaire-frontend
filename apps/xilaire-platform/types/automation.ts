export type AutomationConfig = {
  triggers: Array<{
    id: string;
    type: string;      
    params: any;
  }>;

  conditions: Array<{
    id: string;
    type: string;
    params: any;
  }>;

  actions: Array<{
    id: string;
    type: string;
    params: any;
  }>;
};
