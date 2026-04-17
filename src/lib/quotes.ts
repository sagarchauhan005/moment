import { todayISO } from "./time";

const QUOTES: { text: string; author?: string }[] = [
  { text: "When I let go of what I am, I become what I might be.", author: "Lao Tzu" },
  { text: "The best way to get something done is to begin.", author: "Unknown" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Well done is better than well said.", author: "Benjamin Franklin" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "What we do with this hour, and that one, is what we are doing.", author: "Annie Dillard" },
  { text: "Doing is a quantum leap from imagining.", author: "Barbara Sher" },
  { text: "Your calm mind is the ultimate weapon against your challenges.", author: "Bryant McGill" },
  { text: "Small deeds done are better than great deeds planned.", author: "Peter Marshall" },
  { text: "The journey of a thousand miles begins with one step.", author: "Lao Tzu" },
  { text: "You are what you do, not what you say you'll do.", author: "Carl Jung" },
  { text: "Discipline is choosing between what you want now and what you want most.", author: "Abraham Lincoln" },
  { text: "Action is the foundational key to all success.", author: "Pablo Picasso" },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { text: "Make each day your masterpiece.", author: "John Wooden" },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche" },
  { text: "Concentrate all your thoughts upon the work at hand.", author: "Alexander Graham Bell" },
  { text: "Wherever you are, be there totally.", author: "Eckhart Tolle" },
  { text: "What you do every day matters more than what you do once in a while.", author: "Gretchen Rubin" },
  { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
];

export function quoteForToday(): { text: string; author?: string } {
  const key = todayISO();
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 131 + key.charCodeAt(i)) | 0;
  return QUOTES[Math.abs(h) % QUOTES.length];
}
