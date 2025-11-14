const generate_random_username = () => {
  const adjectives = [
    "cyber",
    "shadow",
    "nova",
    "pixel",
    "quantum",
    "silent",
    "rapid",
    "alpha",
    "neon",
    "zero",
  ];

  const nouns = [
    "hawk",
    "ghost",
    "blade",
    "tiger",
    "wolf",
    "storm",
    "flare",
    "drift",
    "spear",
    "byte",
  ];

  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  const number = Math.floor(1000 + Math.random() * 9000); // 4 digits

  let username = `${adj}${noun}${number}`;

  // ensure max length = 16
  if (username.length > 16) {
    username = username.slice(0, 16);
  }

  return username;
};

export default generate_random_username;
