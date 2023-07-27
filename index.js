
const constants = {
  AlPHANUMERIC: "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYXabcdefghijklmnopqrstuvwxyx",
  BUTTON_RESET_TIMEOUT: 2_500,
  text: {
    BUTTON_COPIED: "Copied to Clipboard!",
    BUTTON_COPYING: "Calculating...",
    BUTTON_DEFAULT: "Calcuate Password",
    BUTTON_FAILED: "Copy Failed!",
  }
}

/*
 * Convert a hex string to a BigInt
 *
 * @param {string} str - The hex string to convert
 * @returns {BigInt} The BigInt representation of the hex string
 */
function hexToBigInt(str) {
  // Remove any leading "0x" if present
  const normalizedBase16 = str.startsWith("0x")
    ? str.slice(2)
    : str;

  // Convert each character in the normalizedBase16 to BigInt and concatenate them
  let bigint = BigInt(0);
  for (let i = 0; i < normalizedBase16.length; i++) {
    const char = normalizedBase16[i];
    const charValue = parseInt(char, 16);
    bigint = (bigint << BigInt(4)) | BigInt(charValue);
  }

  return bigint;
}

/*
 * Convert a BigInt to an alphanumeric string
 *
 * @param {BigInt} num - The BigInt to convert
 * @returns {string} The alphanumeric representation of the BigInt
 */
function toAlphanumeric (str) {
  const digits = [];
  const chars = constants.AlPHANUMERIC.split("");
  var num = hexToBigInt(str);

  while (num > 0n) {
    let ith = num % BigInt(chars.length);

    digits.push(chars[ith]);
    num = num / BigInt(chars.length);
  }

  return digits.join("");
};

/*
 * Convert a buffer to a hex string
 *
 * @param {ArrayBuffer} buffer - The buffer to convert
 * @returns {string} The hex representation of the buffer
 */
function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/*
 * Derive a password from a master password and service
 *
 * @param {string} service - The service to derive the password for
 * @param {string} masterPassword - The master password to derive the password from
 * @param {number} iterations - The number of iterations to use in the PBKDF2 algorithm
 * @param {number} keyLength - The length of the derived key
 *
 * @returns {string} The derived password
 */
async function derivePassword(service, masterPassword, iterations, keyLength) {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(masterPassword),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"],
  );

  const derivedKey = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(service),
      iterations,
      hash: "SHA-1",
    },
    keyMaterial,
    keyLength * 8 * 6,
  );

  return toAlphanumeric(bufferToHex(derivedKey)).slice(0, keyLength);
}

/*
 * Write a string to the clipboard
 *
 * @param {string} key - The string to write to the clipboard
 * @returns {Promise} A promise that resolves when the string has been written to the clipboard
 */
async function writeClipboard(key) {
  return navigator.clipboard.writeText(key);
}

const state = {
  resetPid: null,
}

/*
 * Calculate the password and write it to the clipboard
 *
 * @param {Event} event - the submit event
 * @returns {Promise} A promise that resolves when the password has been written to the clipboard
 */
async function calculatePassword(event) {
  event.preventDefault();

  const $service = document.getElementById("service");
  const $masterPassword = document.getElementById("master-password");
  const $button = document.getElementById("submit");
  const $iterations = document.getElementById("iterations");
  const $length = document.getElementById("length");

  const service = $service.value;
  const masterPassword = $masterPassword.value;
  const iterations = parseInt($iterations.value, 10);
  const keyLength = parseInt($length.value, 10);

  if ($button.className !== "button-default") {
    return;
  }

  if (!service || !masterPassword) {
    return;
  }

  $button.value = constants.text.BUTTON_COPYING;
  $button.className = "button-copying";

  const derivedPassword = await derivePassword(
    service,
    masterPassword,
    iterations,
    keyLength
  );

  try {
    await writeClipboard(derivedPassword);

    $button.value = constants.text.BUTTON_COPIED;
    $button.className = "button-copied";
  } catch (err) {
    $button.value = constants.text.BUTTON_FAILED;
    $button.className = "button-failed";
  } finally {
    if (state.resetPid) {
      return;
    }

    state.resetPid = setTimeout(() => {
      $button.value = constants.text.BUTTON_DEFAULT;
      $button.className = "button-default";
      state.resetPid = null;
    }, constants.BUTTON_RESET_TIMEOUT);
  }
}
