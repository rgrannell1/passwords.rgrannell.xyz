function hexToBigInt(base16String) {
  // Remove any leading "0x" if present
  const normalizedBase16 = base16String.startsWith("0x")
    ? base16String.slice(2)
    : base16String;

  // Convert each character in the normalizedBase16 to BigInt and concatenate them
  let bigint = BigInt(0);
  for (let i = 0; i < normalizedBase16.length; i++) {
    const char = normalizedBase16[i];
    const charValue = parseInt(char, 16);
    bigint = (bigint << BigInt(4)) | BigInt(charValue);
  }

  return bigint;
}

const AlPHANUMERIC =
  "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYXabcdefghijklmnopqrstuvwxyx";

const convertCharset = (str) => {
  const digits = [];
  const chars = AlPHANUMERIC.split("");
  var num = hexToBigInt(str);

  while (num > 0n) {
    let ith = num % BigInt(chars.length);

    digits.push(chars[ith]);
    num = num / BigInt(chars.length);
  }

  return digits.join("");
};

function bufferToHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function derivePassword(service, masterPassword) {
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(masterPassword),
    { name: "PBKDF2" },
    false,
    ["deriveBits", "deriveKey"],
  );

  const bitsLength = 20 * 8 * 6;
  const iterations = 1_000_000;

  const derivedKey = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(service),
      iterations,
      hash: "SHA-1",
    },
    keyMaterial,
    bitsLength,
  );

  return convertCharset(bufferToHex(derivedKey)).slice(0, 20);
}

async function writeClipboard(key) {
  return navigator.clipboard.writeText(key);
}

async function calculatePassword(event) {
  event.preventDefault();

  const BUTTON_RESET_TIMEOUT = 2_000;

  const $service = document.getElementById("service");
  const $masterPassword = document.getElementById("master-password");
  const $button = document.getElementById("submit");

  const service = $service.value;
  const masterPassword = $masterPassword.value;

  if (!service || !masterPassword) {
    return
  }

  $button.value = "Calculating...";
  $button.className = "button-copying";


  const derivedPassword = await derivePassword(
    $service,
    $masterPassword,
  );

  // give feedback via the submit button
  try {
    await writeClipboard(derivedPassword);

    $button.value = "Copied!";
    $button.className = "button-copied";

    setTimeout(() => {
      $button.value = "Calculate Password";
      $button.className = "button-copied";
    }, 2000);
  } catch (err) {
    $button.value = "Copy Failed!";
    $button.className = "button-failed";

    setTimeout(() => {
      $button.value = "Calculate Password";
      $button.className = "button-copied";
    }, 2000);
  }
}
