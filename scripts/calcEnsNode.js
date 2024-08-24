import {ens_normalize} from '@adraffy/ens-normalize';
import { namehash } from '@ensdomains/ensjs/utils';

const ENS = 'piyo.eth';
let normalized = ens_normalize(ENS);
console.log(normalized);

const node = namehash(normalized);
console.log(node);
