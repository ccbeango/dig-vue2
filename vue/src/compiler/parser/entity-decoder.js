/* @flow */

let decoder

export default {
  /**
   * HTML实体字符串解码
   * @param {*} html 
   * @returns 
   */
  decode (html: string): string {
    decoder = decoder || document.createElement('div')
    decoder.innerHTML = html
    return decoder.textContent
  }
}
