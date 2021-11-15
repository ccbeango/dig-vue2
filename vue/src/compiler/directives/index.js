/* @flow */

import on from './on'
import bind from './bind'
import { noop } from 'shared/util'

/**
 * Vue所有平台的基本指令
 *  v-on
 *  v-bind
 *  v-cloak
 */
export default {
  on,
  bind,
  cloak: noop
}
