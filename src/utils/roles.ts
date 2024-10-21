export enum UserRoles {
    ADMIN = 'admin',
    STOCK = 'stock',
    QUERY = 'query',
    NONE = 'none'
}

export const UserRoles2 = Object.freeze([
    UserRoles.ADMIN,
    UserRoles.STOCK,
    UserRoles.QUERY,
    UserRoles.NONE
]) as string[];

export const RolesShowAllFields = Object.freeze([UserRoles.ADMIN, UserRoles.STOCK]);