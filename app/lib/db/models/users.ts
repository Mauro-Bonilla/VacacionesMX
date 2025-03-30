/**
 * Interface representing a user in the system
 */
export interface User {
    rfc: string; // Primary key, 13 chars
    name: string;
    email: string;
    password: string;
    hire_date: Date;
    department_id: string; // UUID
    is_admin: boolean;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }
  
  /**
   * Interface for user data without sensitive information
   */
  export interface SafeUser {
    rfc: string;
    name: string;
    email: string;
    hire_date: Date;
    department_id: string;
    is_admin: boolean;
    is_active: boolean;
    created_at: Date;
    updated_at: Date;
  }
  
  /**
   * Interface for creating a new user
   */
  export interface CreateUserInput {
    rfc: string;
    name: string;
    email: string;
    password: string;
    hire_date: Date;
    department_id: string;
    is_admin?: boolean;
    is_active?: boolean;
  }
  
  /**
   * Interface for updating a user
   */
  export interface UpdateUserInput {
    name?: string;
    email?: string;
    password?: string;
    department_id?: string;
    is_admin?: boolean;
    is_active?: boolean;
  }