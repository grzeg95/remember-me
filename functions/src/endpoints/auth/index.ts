import {fnBuilder} from '../../config';

export const userOnDelete = fnBuilder.auth.user().onDelete(require('./user-on-delete').handler);
