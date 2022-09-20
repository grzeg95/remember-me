import {auth} from 'firebase-admin';
import {https, Response} from 'firebase-functions';
import {AuthData} from 'firebase-functions/lib/common/providers/https';
import {HttpsError} from 'firebase-functions/lib/providers/https';
import {authorizedDomains} from '../config';
import {ContentType, FunctionResult, FunctionResultPromise} from './models';

const cors = require('cors')({
  methods: ['POST', 'OPTIONS'],
  allowedHeaders: ['authorization', 'content-type'],
  origin: (requestOrigin: string, callback: (err: Error | null, origin?: boolean) => void) => {

    if (!process.env.FUNCTIONS_EMULATOR) {

      const domainFound = authorizedDomains.find((domain) => {
        const constForRegex = (domain as string).replace(/\./g, '\\.');
        const regex = new RegExp(`^https:\/\/${constForRegex}$`, 'g');
        const found = regex.exec(requestOrigin);
        return found !== null;
      });

      if (domainFound) {
        callback(null, true);
      } else {
        callback(new Error());
      }
    } else {
      callback(null, true);
    }
  }
});

export interface Context {
  req: https.Request,
  res: Response,
  auth?: AuthData,
  data?: any
}

const getContext = (req: https.Request, res: Response): Promise<Context> => {

  const authPromise = auth().verifyIdToken(req.headers.authorization?.split('Bearer ')[1] + '').catch(() => undefined);

  return Promise.all([authPromise]).then(([decodedIdToken]) => {

    let data = req.body;

    const contentType = req.get('content-type');

    if (contentType === 'text/plain' && req.body.length === 0) {
      data = null;
    }

    if (contentType === 'application/json' && Object.getOwnPropertyNames(req.body).length === 0) {
      data = null;
    }

    return {
      req,
      res,
      auth: decodedIdToken ? {
        uid: decodedIdToken.uid,
        token: decodedIdToken
      } : undefined,
      data
    };
  });
};

export const handler = (req: https.Request, res: Response, next: (context: Context) => FunctionResultPromise, options: {
  contentType: ContentType | ContentType[]
}) => {

  const rawRequest = req;
  const url = (req.headers['origin'] || req.headers['referer']) as string;
  rawRequest.headers.origin = new URL(url).origin;

  return cors(rawRequest, res, () => getContext(req, res).then((context) => {

    if (((
        Array.isArray(options.contentType) &&
        options.contentType.indexOf((context.req.get('content-type') || '') as ContentType) === -1
      ) ||
      (
        typeof options.contentType === 'string' &&
        options.contentType !== (context.req.get('content-type') || '')
      ))) {
      sendError(res);
      return;
    }

    next(context).then((functionResult) => {
      sendSuccess(res, functionResult);
    }).catch((err) => {
      sendError(res, err);
    });
  }));
};

const sendResponse = (res: Response, body: Object, code: number) => {
  res.status(code);
  res.type('application/json');
  res.send({
    result: body
  });
  res.end();
};

const sendError = (res: Response, err?: any) => {

  if (!err || err.constructor.name !== 'HttpsError') {
    const httpsError = new HttpsError(
      'aborted',
      'Bad Request',
      'Some went wrong 🤫 Try again 🙂'
    );
    sendResponse(res, httpsError, httpsError.httpErrorCode.status);
  } else {
    sendResponse(res, err, err.httpErrorCode.status);
  }
};

const sendSuccess = (res: Response, functionResult: FunctionResult) => {
  sendResponse(res, functionResult.body, functionResult.code);
};
