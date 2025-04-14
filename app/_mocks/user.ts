import { User } from "../lib/db/models/users";

export const userMock: User = {
    rfc: 'MEGS801205ABC',
    name: 'Ana Sánchez',
    email: 'ana.sanchez@company.mx',
    hire_date: new Date('2019-02-16')
    
} as User;