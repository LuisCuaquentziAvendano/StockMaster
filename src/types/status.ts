export enum GeneralUseStatus {
    ACTIVE = 'active',
    DELETED = 'deleted'
}

export enum UserStatus {
    NEW = 'new',
    ACTIVE = GeneralUseStatus.ACTIVE,
    DELETED = GeneralUseStatus.DELETED
}