"use strict";

class Objects {
  static isObject(item) {
    return item && typeof item === 'object' && !Array.isArray(item);
  }

  /**
   * Deep merge two or more objects. taken from https://stackoverflow.com/a/34749873
   * @param target
   * @param ...sources
   */
  static deepMergeObjects(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();
    if (this.isObject(target) && this.isObject(source)) {
      for (const key in source) {
        if (this.isObject(source[key])) {
          if (!target[key]) Object.assign(target, {
            [key]: {}
          });
          this.deepMergeObjects(target[key], source[key]);
        } else {
          Object.assign(target, {
            [key]: source[key]
          });
        }
      }
    }
    return this.deepMergeObjects(target, ...sources);
  }
}
module.exports = Objects;