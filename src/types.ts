export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Optional for now, but will be used in login
  role: 'admin' | 'student';
  completedModules: string[]; // IDs of modules
}

export interface Module {
  id: string;
  title: string;
  description: string;
}

export interface Certificate {
  id: string;
  studentId: string;
  studentName: string;
  issueDate: string;
  hash: string; // Digital signature dummy
}
