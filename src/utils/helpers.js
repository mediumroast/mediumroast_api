// This file includes utility functions that assist with various tasks throughout the module.

export const isEmpty = (value) => {
  return value === null || value === undefined || value === '';
};

export const isArray = (value) => {
  return Array.isArray(value);
};

export const deepClone = (obj) => {
  return JSON.parse(JSON.stringify(obj));
};

export const mergeObjects = (target, source) => {
  return { ...target, ...source };
};

export const formatDate = (date) => {
  if (!(date instanceof Date)) {
    throw new Error('Invalid date');
  }
  return date.toISOString().split('T')[0];
};