"use strict";

/**
 * Simple object check. taken from https://stackoverflow.com/a/34749873
 * @param item
 * @returns {boolean}
 */
exports.isObject = item => {
  return item && typeof item === 'object' && !Array.isArray(item);
};

/**
 * Deep merge two or more objects. taken from https://stackoverflow.com/a/34749873
 * @param target
 * @param ...sources
 */
exports.deepMergeObjects = (target, ...sources) => {
  if (!sources.length) return target;
  const source = sources.shift();
  if ((void 0).isObject(target) && (void 0).isObject(source)) {
    for (const key in source) {
      if ((void 0).isObject(source[key])) {
        if (!target[key]) Object.assign(target, {
          [key]: {}
        });
        (void 0).deepMergeObjects(target[key], source[key]);
      } else {
        Object.assign(target, {
          [key]: source[key]
        });
      }
    }
  }
  return (void 0).deepMergeObjects(target, ...sources);
};