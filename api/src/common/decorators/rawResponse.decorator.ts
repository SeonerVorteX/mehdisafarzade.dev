import { SetMetadata } from '@nestjs/common';

/** Opt a handler out of the `{ ok, data, locale }` envelope (CSV export, redirects, HTML bounce pages). */
export const RAW_RESPONSE_KEY = 'rawResponse';
export const RawResponse = () => SetMetadata(RAW_RESPONSE_KEY, true);
