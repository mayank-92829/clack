// Quotes from public-domain works and short, widely quoted lines.
// Length groups: short <= 100 chars, medium <= 250, long above.

export interface Quote {
  text: string;
  source: string;
}

export const QUOTES: Quote[] = [
  { text: "Brevity is the soul of wit.", source: "William Shakespeare, Hamlet" },
  { text: "Well done is better than well said.", source: "Benjamin Franklin" },
  { text: "Lost time is never found again.", source: "Benjamin Franklin" },
  { text: "Energy and persistence conquer all things.", source: "Benjamin Franklin" },
  { text: "Knowledge is power.", source: "Francis Bacon" },
  { text: "I think, therefore I am.", source: "Rene Descartes" },
  { text: "The unexamined life is not worth living.", source: "Socrates" },
  { text: "Little by little, one travels far.", source: "Spanish proverb" },
  { text: "The journey of a thousand miles begins with a single step.", source: "Lao Tzu" },
  { text: "Hope is the thing with feathers that perches in the soul.", source: "Emily Dickinson" },
  { text: "Nothing in life is to be feared, it is only to be understood.", source: "Marie Curie" },
  { text: "If I have seen further it is by standing on the shoulders of Giants.", source: "Isaac Newton" },
  { text: "There is nothing either good or bad, but thinking makes it so.", source: "William Shakespeare, Hamlet" },
  { text: "We are all in the gutter, but some of us are looking at the stars.", source: "Oscar Wilde" },
  { text: "To live is the rarest thing in the world. Most people exist, that is all.", source: "Oscar Wilde" },
  { text: "You see, but you do not observe. The distinction is clear.", source: "Arthur Conan Doyle" },
  { text: "It is a capital mistake to theorize before one has data.", source: "Arthur Conan Doyle" },
  { text: "Why, sometimes I've believed as many as six impossible things before breakfast.", source: "Lewis Carroll" },
  { text: "Trust thyself: every heart vibrates to that iron string.", source: "Ralph Waldo Emerson" },
  { text: "Whatever is worth doing at all is worth doing well.", source: "Lord Chesterfield" },
  { text: "So we beat on, boats against the current, borne back ceaselessly into the past.", source: "F. Scott Fitzgerald" },
  { text: "Premature optimization is the root of all evil.", source: "Donald Knuth" },
  { text: "Simplicity is prerequisite for reliability.", source: "Edsger W. Dijkstra" },
  { text: "Talk is cheap. Show me the code.", source: "Linus Torvalds" },
  { text: "Make it work, make it right, make it fast.", source: "Kent Beck" },
  { text: "The best way to predict the future is to invent it.", source: "Alan Kay" },
  { text: "Controlling complexity is the essence of computer programming.", source: "Brian Kernighan" },
  { text: "First, solve the problem. Then, write the code.", source: "John Johnson" },
  { text: "The fault, dear Brutus, is not in our stars, but in ourselves, that we are underlings.", source: "William Shakespeare, Julius Caesar" },
  { text: "Happy families are all alike; every unhappy family is unhappy in its own way.", source: "Leo Tolstoy, Anna Karenina" },

  { text: "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.", source: "Jane Austen, Pride and Prejudice" },
  { text: "Two roads diverged in a wood, and I, I took the one less traveled by, and that has made all the difference.", source: "Robert Frost" },
  { text: "When you have eliminated the impossible, whatever remains, however improbable, must be the truth.", source: "Arthur Conan Doyle" },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute.", source: "Harold Abelson" },
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", source: "Martin Fowler" },
  { text: "There are only two hard things in Computer Science: cache invalidation and naming things.", source: "Phil Karlton" },
  { text: "Debugging is twice as hard as writing the code in the first place. Therefore, if you write the code as cleverly as possible, you are, by definition, not smart enough to debug it.", source: "Brian Kernighan" },
  { text: "A foolish consistency is the hobgoblin of little minds, adored by little statesmen and philosophers and divines.", source: "Ralph Waldo Emerson" },
  { text: "To believe your own thought, to believe that what is true for you in your private heart is true for all men, that is genius.", source: "Ralph Waldo Emerson" },
  { text: "I am no bird; and no net ensnares me: I am a free human being with an independent will, which I now exert to leave you.", source: "Charlotte Bronte, Jane Eyre" },
  { text: "We are such stuff as dreams are made on, and our little life is rounded with a sleep.", source: "William Shakespeare, The Tempest" },
  { text: "Tomorrow, and tomorrow, and tomorrow, creeps in this petty pace from day to day, to the last syllable of recorded time; and all our yesterdays have lighted fools the way to dusty death.", source: "William Shakespeare, Macbeth" },
  { text: "I celebrate myself, and sing myself, and what I assume you shall assume, for every atom belonging to me as good belongs to you.", source: "Walt Whitman" },
  { text: "Begin at the beginning, the King said, very gravely, and go on till you come to the end: then stop.", source: "Lewis Carroll" },
  { text: "Once upon a midnight dreary, while I pondered, weak and weary, over many a quaint and curious volume of forgotten lore, while I nodded, nearly napping, suddenly there came a tapping, as of some one gently rapping, rapping at my chamber door.", source: "Edgar Allan Poe, The Raven" },
  { text: "My name is Ozymandias, King of Kings; look on my Works, ye Mighty, and despair! Nothing beside remains. Round the decay of that colossal Wreck, boundless and bare, the lone and level sands stretch far away.", source: "Percy Bysshe Shelley" },
  { text: "I went to the woods because I wished to live deliberately, to front only the essential facts of life, and see if I could not learn what it had to teach, and not, when I came to die, discover that I had not lived.", source: "Henry David Thoreau, Walden" },

  { text: "It was the best of times, it was the worst of times, it was the age of wisdom, it was the age of foolishness, it was the epoch of belief, it was the epoch of incredulity, it was the season of Light, it was the season of Darkness, it was the spring of hope, it was the winter of despair, we had everything before us, we had nothing before us, we were all going direct to Heaven, we were all going direct the other way.", source: "Charles Dickens, A Tale of Two Cities" },
  { text: "Call me Ishmael. Some years ago, never mind how long precisely, having little or no money in my purse, and nothing particular to interest me on shore, I thought I would sail about a little and see the watery part of the world. It is a way I have of driving off the spleen and regulating the circulation.", source: "Herman Melville, Moby-Dick" },
  { text: "Four score and seven years ago our fathers brought forth on this continent, a new nation, conceived in Liberty, and dedicated to the proposition that all men are created equal. Now we are engaged in a great civil war, testing whether that nation, or any nation so conceived and so dedicated, can long endure. We are met on a great battle-field of that war.", source: "Abraham Lincoln, Gettysburg Address" },
  { text: "Alice was beginning to get very tired of sitting by her sister on the bank, and of having nothing to do: once or twice she had peeped into the book her sister was reading, but it had no pictures or conversations in it, and what is the use of a book, thought Alice, without pictures or conversations?", source: "Lewis Carroll, Alice's Adventures in Wonderland" },
  { text: "If you can keep your head when all about you are losing theirs and blaming it on you, if you can trust yourself when all men doubt you, but make allowance for their doubting too; if you can wait and not be tired by waiting, or being lied about, don't deal in lies, or being hated, don't give way to hating, and yet don't look too good, nor talk too wise.", source: "Rudyard Kipling, If" },
  { text: "When in the Course of human events, it becomes necessary for one people to dissolve the political bands which have connected them with another, and to assume among the powers of the earth, the separate and equal station to which the Laws of Nature and of Nature's God entitle them, a decent respect to the opinions of mankind requires that they should declare the causes which impel them to the separation.", source: "Declaration of Independence" },
  { text: "We hold these truths to be self-evident, that all men are created equal, that they are endowed by their Creator with certain unalienable Rights, that among these are Life, Liberty and the pursuit of Happiness. That to secure these rights, Governments are instituted among Men, deriving their just powers from the consent of the governed.", source: "Declaration of Independence" },
];

export type QuoteLength = "all" | "short" | "medium" | "long";

export function lengthOf(q: Quote): Exclude<QuoteLength, "all"> {
  const n = q.text.length;
  return n <= 100 ? "short" : n <= 250 ? "medium" : "long";
}
