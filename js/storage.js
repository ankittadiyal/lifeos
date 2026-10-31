export function loadData(key, fallbackValue = null) {
  let savedValue;

  try {
    savedValue = localStorage.getItem(key);
  } catch (error) {
    console.error(`Could not read "${key}" from browser storage.`, error);
    return fallbackValue;
  }

  if (savedValue === null) {
    return fallbackValue;
  }

  try {
    return JSON.parse(savedValue);
  } catch (error) {
    if (!(error instanceof SyntaxError)) {
      throw error;
    }

    console.error(`Saved data for "${key}" is not valid JSON.`, error);
    return fallbackValue;
  }
}

export function saveData(key, value) {
  const serializedValue = JSON.stringify(value);

  if (serializedValue === undefined) {
    throw new TypeError("This value cannot be saved as JSON.");
  }

  localStorage.setItem(key, serializedValue);
}

export function removeData(key) {
  localStorage.removeItem(key);
}