export type SymbolProviderId = 'arasaac' | 'pcs' | 'symbolstix';

interface SymbolProvider {
  label: string;
  resolveImageUrl: (term: string) => Promise<string | null>;
}

const TERM_BY_LABEL: Record<string, string> = {
  Mom: 'mother',
  Dad: 'father',
  Sister: 'sister',
  Brother: 'brother',
  Want: 'want',
  Eat: 'eat',
  Drink: 'drink',
  More: 'more',
  'All done': 'finish',
  Help: 'help',
  Yes: 'yes',
  No: 'no',
  Teacher: 'teacher',
  Book: 'book',
  Play: 'play',
  Friends: 'friends',
  Bathroom: 'bathroom',
  Therapist: 'doctor', // ARASAAC doesn't have therapist; doctor is closest professional icon
  Exercise: 'exercise',
  Tired: 'tired',
  Pain: 'hurt', // More intuitive iconography than 'pain'
  Car: 'car',
  Park: 'park',
  Store: 'store',
  Home: 'home',
  Happy: 'happy',
  Sad: 'sad',
  Angry: 'angry',
  Scared: 'scared',
  Sick: 'sick',
  Go: 'go',
  Stop: 'stop',
  Wait: 'wait',
  Come: 'come',
  // Activities
  Sport: 'sport',
  Game: 'game',
  Art: 'art',
  Movie: 'movie',
  Music: 'music',
  Dance: 'dance',
  Sing: 'sing',
  Read: 'read',
  Draw: 'draw',
  Swim: 'swim',
  Bike: 'bike',
  Build: 'build',
  Watch: 'watch',
  Listen: 'listen',
  Learn: 'learn',
  // Descriptors
  Big: 'big',
  Small: 'small',
  Good: 'good',
  Bad: 'bad',
  Hot: 'hot',
  Cold: 'cold',
  Wet: 'wet',
  Dry: 'dry',
  Clean: 'clean',
  Dirty: 'dirty',
  Soft: 'soft',
  Hard: 'hard',
  Smooth: 'smooth',
  Rough: 'rough',
  Fast: 'fast',
  Slow: 'slow',
  Loud: 'loud',
  Quiet: 'quiet',
  Beautiful: 'beautiful',
  Ugly: 'ugly',
  Easy: 'easy',
  Heavy: 'heavy',
  Light: 'light',
  Bright: 'bright',
  Dark: 'dark',
  // Places
  School: 'school',
  Hospital: 'hospital',
  Doctor: 'doctor',
  Beach: 'beach',
  Mountain: 'mountain',
  Forest: 'forest',
  River: 'river',
  Lake: 'lake',
  City: 'city',
  Town: 'town',
  Restaurant: 'restaurant',
  Library: 'library',
  Zoo: 'zoo',
  Playground: 'playground',
  Street: 'street',
  Office: 'office',
  // Additional Actions
  Look: 'look',
  Open: 'open',
  Close: 'close',
  'Turn on': 'turn on',
  'Turn off': 'turn off',
  Give: 'give',
  Take: 'take',
  Sit: 'sit',
  Stand: 'stand',
  Walk: 'walk',
  Run: 'run',
  Jump: 'jump',
  Climb: 'climb',
  Push: 'push',
  Pull: 'pull',
  Hold: 'hold',
  Put: 'put',
  'Pick up': 'pick up',
  Drop: 'drop',
  Find: 'find',
  Get: 'get',
  Make: 'make',
  Break: 'break',
  Fix: 'fix',
  Hit: 'hit',
  Catch: 'catch',
  Throw: 'throw',
  Kick: 'kick',
  Ask: 'ask',
  // Emotions - extended
  Excited: 'excited',
  Worried: 'worried',
  Calm: 'calm',
  Frustrated: 'frustrated',
  Annoyed: 'annoyed',
  Proud: 'proud',
  Bored: 'bored',
  Surprised: 'surprised',
  Nervous: 'nervous',
  Lonely: 'lonely',
  Confused: 'confused',
  Comfortable: 'comfortable',
  Brave: 'brave',
  Silly: 'silly',
  Sleepy: 'sleepy',
  Hungry: 'hungry',
  Thirsty: 'thirsty',
  Hurt: 'hurt',
  Itch: 'itch',
  Wonderful: 'wonderful',
  Loved: 'loved',
  Special: 'special',
  Funny: 'funny',
  // Home activities
  Bed: 'bed',
  Sleep: 'sleep',
  'Wake up': 'wake up',
  Bath: 'bath',
  Wash: 'wash',
  'Brush teeth': 'brush teeth',
  Potty: 'potty',
  TV: 'television',
  Show: 'show',
  Song: 'song',
  Toy: 'toy',
  Blanket: 'blanket',
  Hug: 'hug',
  Kiss: 'kiss',
  // School subjects
  Class: 'class',
  Science: 'science',
  Math: 'math',
  Pencil: 'pencil',
  Pen: 'pen',
  Paper: 'paper',
  Marker: 'marker',
  Color: 'color',
  Cut: 'cut',
  Glue: 'glue',
  Lunch: 'lunch',
  Recess: 'recess',
  Backpack: 'backpack',
  Computer: 'computer',
  // Health and Wellness
  Stretch: 'stretch',
  Breathe: 'breathe',
  Massage: 'massage',
  Therapy: 'therapy',
  Rest: 'rest',
  Again: 'again',
  Gentle: 'gentle',
  Strong: 'strong',
  Medicine: 'medicine',
  // Community
  Drive: 'drive',
  Bus: 'bus',
  Train: 'train',
  Shop: 'shop',
  Outside: 'outside',
  Water: 'water',
  // Core pronouns and foundational
  I: 'I',
  You: 'you',
  We: 'we',
  He: 'he',
  She: 'she',
  Love: 'love',
  "Don't like": 'not like',
  Not: 'not',
  Can: 'can',
  "Can't": 'cannot',
  This: 'this',
  That: 'that',
  Mine: 'mine',
  Have: 'have',
  Okay: 'okay',
  Please: 'please',
  'Thank you': 'thank you',
  Mama: 'mama',
  Dada: 'dada',
  Grandma: 'grandma',
  Grandpa: 'grandpa',
  Cousin: 'cousin',
  Aunt: 'aunt',
  Uncle: 'uncle',
  Friend: 'friend',
  Baby: 'baby',
  Pet: 'pet',
  Dog: 'dog',
  Cat: 'cat',
  Person: 'person',
  Milk: 'milk',
  Juice: 'juice',
  Apple: 'apple',
  Orange: 'orange',
  Banana: 'banana',
  Bread: 'bread',
  Cheese: 'cheese',
  Cookie: 'cookie',
  Crackers: 'crackers',
  Pizza: 'pizza',
  Snack: 'snack',
  Now: 'now',
  Later: 'later',
  After: 'after',
  Before: 'before',
  Morning: 'morning',
  Afternoon: 'afternoon',
  Night: 'night',
  Today: 'today',
  Tomorrow: 'tomorrow',
  Yesterday: 'yesterday',
  Monday: 'monday',
  Friday: 'friday',
  Weekend: 'weekend',
  Soon: 'soon',
  What: 'what',
  Where: 'where',
  When: 'when',
  Why: 'why',
  Who: 'who',
  How: 'how',
  Which: 'which',
  'Do you': 'do you',
  'Can I': 'can I',
  'Is it': 'is it',
  Swing: 'swing',
  Slide: 'slide',
  Yummy: 'yummy',
  Gross: 'disgusting',
};

const PREFIX_SEPARATOR = ':';
export const DEFAULT_SYMBOL_PROVIDER: SymbolProviderId = 'arasaac';
const SYMBOL_INDEX_STORAGE_KEY = 'masn_symbol_index_v1';

const arasaacCache = new Map<string, string | null>();
const arasaacIdCache = new Map<string, number>();

const canUseLocalStorage = () => typeof globalThis !== 'undefined' && 'localStorage' in globalThis;

const readPersistedSymbolIndex = (): Record<string, number> => {
  if (!canUseLocalStorage()) return {};

  try {
    const raw = globalThis.localStorage.getItem(SYMBOL_INDEX_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};

    const next: Record<string, number> = {};
    Object.entries(parsed as Record<string, unknown>).forEach(([term, value]) => {
      if (typeof value === 'number' && Number.isFinite(value)) {
        next[term] = value;
      }
    });
    return next;
  } catch {
    return {};
  }
};

const persistSymbolIndex = (index: Record<string, number>) => {
  if (!canUseLocalStorage()) return;

  try {
    globalThis.localStorage.setItem(SYMBOL_INDEX_STORAGE_KEY, JSON.stringify(index));
  } catch {
    // Ignore storage quota and private browsing failures.
  }
};

const getCachedArasaacId = (term: string): number | null => {
  if (arasaacIdCache.has(term)) {
    return arasaacIdCache.get(term) ?? null;
  }

  const index = readPersistedSymbolIndex();
  const id = index[term];
  if (typeof id === 'number' && Number.isFinite(id)) {
    arasaacIdCache.set(term, id);
    return id;
  }

  return null;
};

const cacheArasaacId = (term: string, id: number) => {
  arasaacIdCache.set(term, id);
  const index = readPersistedSymbolIndex();
  index[term] = id;
  persistSymbolIndex(index);
};

const providers: Record<SymbolProviderId, SymbolProvider> = {
  arasaac: {
    label: 'ARASAAC',
    resolveImageUrl: async (term: string) => {
      if (!term) return null;
      if (arasaacCache.has(term)) return arasaacCache.get(term) ?? null;

      const cachedId = getCachedArasaacId(term);
      if (cachedId) {
        const cachedUrl = `https://api.arasaac.org/api/pictograms/${cachedId}?download=false`;
        arasaacCache.set(term, cachedUrl);
        return cachedUrl;
      }

      try {
        const response = await fetch(`https://api.arasaac.org/api/pictograms/en/search/${encodeURIComponent(term)}`);
        if (!response.ok) {
          arasaacCache.set(term, null);
          return null;
        }

        const results = (await response.json()) as Array<{ _id: number }>;
        const first = results[0];
        if (!first?._id) {
          arasaacCache.set(term, null);
          return null;
        }

        cacheArasaacId(term, first._id);
        const url = `https://api.arasaac.org/api/pictograms/${first._id}?download=false`;
        arasaacCache.set(term, url);
        return url;
      } catch {
        arasaacCache.set(term, null);
        return null;
      }
    },
  },
  pcs: {
    label: 'PCS (planned)',
    resolveImageUrl: async () => null,
  },
  symbolstix: {
    label: 'SymbolStix (planned)',
    resolveImageUrl: async () => null,
  },
};

export const SYMBOL_PROVIDER_OPTIONS = [
  { id: 'arasaac' as SymbolProviderId, label: providers.arasaac.label },
  { id: 'pcs' as SymbolProviderId, label: providers.pcs.label },
  { id: 'symbolstix' as SymbolProviderId, label: providers.symbolstix.label },
];

const parseSymbol = (
  symbol?: string | null,
  fallbackLabel?: string,
  fallbackProvider: SymbolProviderId = DEFAULT_SYMBOL_PROVIDER
) => {
  if (!symbol) {
    return {
      provider: fallbackProvider,
      term: fallbackLabel ? fallbackLabel.toLowerCase() : 'communication',
    };
  }

  const [rawProvider, ...rest] = symbol.split(PREFIX_SEPARATOR);
  if (rest.length > 0 && rawProvider in providers) {
    return {
      provider: rawProvider as SymbolProviderId,
      term: rest.join(PREFIX_SEPARATOR),
    };
  }

  return {
    provider: fallbackProvider,
    term: symbol,
  };
};

export const getSymbolForWord = (label: string, provider: SymbolProviderId = DEFAULT_SYMBOL_PROVIDER): string => {
  const term = TERM_BY_LABEL[label] ?? label.toLowerCase();
  return `${provider}${PREFIX_SEPARATOR}${term.trim().toLowerCase()}`;
};

export const getSymbolTerm = (symbol?: string | null, fallbackLabel?: string): string => {
  return parseSymbol(symbol, fallbackLabel).term;
};

export const getSymbolProvider = (
  symbol?: string | null,
  fallbackProvider: SymbolProviderId = DEFAULT_SYMBOL_PROVIDER
): SymbolProviderId => {
  return parseSymbol(symbol, undefined, fallbackProvider).provider;
};

export const toProviderSymbol = (term: string, provider: SymbolProviderId = DEFAULT_SYMBOL_PROVIDER): string => {
  return `${provider}${PREFIX_SEPARATOR}${term.trim().toLowerCase()}`;
};

export const toArasaacSymbol = (term: string): string => {
  return toProviderSymbol(term, 'arasaac');
};

export const resolveSymbolImageUrl = async (
  symbol?: string | null,
  fallbackLabel?: string,
  fallbackProvider: SymbolProviderId = DEFAULT_SYMBOL_PROVIDER
): Promise<string | null> => {
  const { provider, term } = parseSymbol(symbol, fallbackLabel, fallbackProvider);
  return providers[provider].resolveImageUrl(term);
};

export const resolveArasaacImageUrl = async (symbol?: string | null, fallbackLabel?: string): Promise<string | null> => {
  return resolveSymbolImageUrl(symbol, fallbackLabel, 'arasaac');
};

export const getSymbolProviderLabel = (provider: SymbolProviderId): string => {
  return providers[provider].label;
};

export const isSymbolProviderImplemented = (provider: SymbolProviderId): boolean => {
  return provider === 'arasaac';
};
