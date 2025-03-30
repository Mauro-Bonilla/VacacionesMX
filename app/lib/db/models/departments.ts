/**
 * Interface representing a department in the system
 */
export interface Department {
    id: string; // UUID
    name: string;
    created_at: Date;
    updated_at: Date;
  }
  
  /**
   * Interface for creating a new department
   */
  export interface CreateDepartmentInput {
    name: string;
  }
  
  /**
   * Interface for updating a department
   */
  export interface UpdateDepartmentInput {
    name?: string;
  }