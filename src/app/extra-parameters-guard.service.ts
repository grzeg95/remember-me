import {Injectable} from '@angular/core';
import {AngularFirestore} from '@angular/fire/compat/firestore';
import {ActivatedRouteSnapshot, CanActivate} from '@angular/router';

@Injectable()
export class ExtraParametersGuard implements CanActivate {

  constructor(
    private afs: AngularFirestore
  ) {
  }

  canActivate(route: ActivatedRouteSnapshot): boolean | Promise<boolean> {

    const fbclid = route.queryParams['fbclid'];

    if (fbclid) {
      return this.afs.collection<{entered: number}>(
        '/fbclid',
        (ref) => ref.where('id', '==', fbclid).limit(1)
      ).get().toPromise().then((querySnap) => {

        if (querySnap.docs.length === 0) {
          return this.afs.collection('/fbclid').doc().set({
            entered: 1,
            id: fbclid
          }).then(() => true).catch(() => true);
        } else {

          const doc = querySnap.docs[0];
          const entered = doc.data()?.entered || 0;

          return doc.ref.update({
            entered: entered + 1
          }).then(() => true).catch(() => true);
        }
      }).catch(() => true);
    }

    return true;
  }
}
