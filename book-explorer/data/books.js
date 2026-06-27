/* books.js — Book Explorer dataset.
   NOTE on shape: to share the globe engine with its sibling Music Explorer, the data uses
   the same generic keys — `songs` holds BOOKS and `artists` holds AUTHORS.
   Book fields: title, artist(=author), country(=author nationality), year, genre, language,
     audience ('adult'|'children'|'all'), sales(=copies sold), translations(=# languages),
     awards(text), awardCount, pop(0-100 fame), blurb.
   Figures are best-documented public estimates (Wikipedia best-seller/most-translated lists,
   Nobel/Booker/Pulitzer records). A research sweep can later expand this to music-parity. */
window.BOOKS = {
  meta: { version: "seed-1", note: "Curated dataset — research enrichment pending" },

  population: [
    [1600,0.55],[1700,0.60],[1750,0.79],
    [1800,0.99],[1850,1.26],[1900,1.65],[1910,1.75],[1920,1.86],[1930,2.07],
    [1940,2.30],[1950,2.54],[1955,2.77],[1960,3.03],[1965,3.34],[1970,3.70],
    [1975,4.07],[1980,4.46],[1985,4.87],[1990,5.33],[1995,5.74],[2000,6.17],
    [2005,6.54],[2010,6.96],[2015,7.43],[2020,7.84],[2025,8.23],[2026,8.27]
  ],

  songs: [
    // ===== Sacred / foundational texts =====
    {title:"The Bible",artist:"Various authors",country:"Israel",year:-700,genre:"Religious text",language:"Hebrew / Greek",audience:"all",sales:5000000000,translations:700,pop:99,blurb:"The best-selling and most-translated book in human history, by a wide margin."},
    {title:"The Quran",artist:"Recorded revelation of Muhammad",country:"Saudi Arabia",year:650,genre:"Religious text",language:"Arabic",audience:"all",sales:800000000,translations:114,pop:95,blurb:"Islam's holy book, recited and memorised by billions over 14 centuries."},
    {title:"Quotations from Chairman Mao",artist:"Mao Zedong",country:"China",year:1964,genre:"Political",language:"Chinese",audience:"adult",sales:1000000000,pop:84,blurb:"The 'Little Red Book' — printed in the billions during China's Cultural Revolution."},
    {title:"The Bhagavad Gita",artist:"Vyasa (attributed)",country:"India",year:-200,genre:"Scripture / Philosophy",language:"Sanskrit",audience:"all",translations:80,pop:84,blurb:"Krishna's battlefield counsel to Arjuna — the heart of Hindu philosophy."},
    {title:"The Tao Te Ching",artist:"Laozi",country:"China",year:-400,genre:"Philosophy",language:"Chinese",audience:"all",translations:250,pop:82,blurb:"The foundational text of Taoism and one of the most translated works ever."},
    {title:"The Analects",artist:"Confucius",country:"China",year:-480,genre:"Philosophy",language:"Chinese",audience:"adult",pop:80,blurb:"The sayings of Confucius that shaped East Asian thought for millennia."},

    // ===== Best-selling novels of all time =====
    {title:"Don Quixote",artist:"Miguel de Cervantes",country:"Spain",year:1605,genre:"Classic literature",language:"Spanish",audience:"adult",sales:500000000,pop:96,blurb:"Often called the first modern novel — and the best-selling single novel of all time."},
    {title:"A Tale of Two Cities",artist:"Charles Dickens",country:"United Kingdom",year:1859,genre:"Historical fiction",language:"English",audience:"adult",sales:200000000,pop:90,blurb:"'It was the best of times…' — Dickens's epic of the French Revolution."},
    {title:"The Lord of the Rings",artist:"J. R. R. Tolkien",country:"United Kingdom",year:1954,genre:"Fantasy",language:"English",audience:"adult",sales:150000000,translations:38,pop:95,blurb:"The book that defined modern fantasy."},
    {title:"The Little Prince",artist:"Antoine de Saint-Exupéry",country:"France",year:1943,genre:"Children's / Fable",language:"French",audience:"all",sales:200000000,translations:505,pop:95,blurb:"The most-translated non-religious book in the world."},
    {title:"The Hobbit",artist:"J. R. R. Tolkien",country:"United Kingdom",year:1937,genre:"Fantasy",language:"English",audience:"all",sales:100000000,pop:90,blurb:"In a hole in the ground there lived a hobbit — the gateway to Middle-earth."},
    {title:"Dream of the Red Chamber",artist:"Cao Xueqin",country:"China",year:1791,genre:"Classic literature",language:"Chinese",audience:"adult",sales:100000000,pop:86,blurb:"The greatest of China's Four Classic Novels."},
    {title:"And Then There Were None",artist:"Agatha Christie",country:"United Kingdom",year:1939,genre:"Mystery",language:"English",audience:"adult",sales:100000000,pop:88,blurb:"The best-selling crime novel of all time."},
    {title:"The Alchemist",artist:"Paulo Coelho",country:"Brazil",year:1988,genre:"Fiction",language:"Portuguese",audience:"all",sales:65000000,translations:80,pop:86,blurb:"A shepherd's quest fable that became a global phenomenon."},
    {title:"The Da Vinci Code",artist:"Dan Brown",country:"United States",year:2003,genre:"Thriller",language:"English",audience:"adult",sales:80000000,pop:84,blurb:"The conspiracy thriller that defined 2000s blockbuster fiction."},
    {title:"Harry Potter and the Philosopher's Stone",artist:"J. K. Rowling",country:"United Kingdom",year:1997,genre:"Fantasy",language:"English",audience:"children",sales:120000000,pop:96,blurb:"The first of the best-selling book series in history (600M+ across seven volumes)."},
    {title:"The Catcher in the Rye",artist:"J. D. Salinger",country:"United States",year:1951,genre:"Literary fiction",language:"English",audience:"adult",sales:65000000,pop:84,blurb:"Holden Caulfield's voice defined post-war adolescence."},
    {title:"To Kill a Mockingbird",artist:"Harper Lee",country:"United States",year:1960,genre:"Literary fiction",language:"English",audience:"adult",sales:40000000,awards:"Pulitzer Prize 1961",awardCount:1,pop:90,blurb:"A moral landmark of American literature."},
    {title:"The Name of the Rose",artist:"Umberto Eco",country:"Italy",year:1980,genre:"Mystery",language:"Italian",audience:"adult",sales:50000000,pop:82,blurb:"A medieval murder mystery soaked in semiotics."},
    {title:"Think and Grow Rich",artist:"Napoleon Hill",country:"United States",year:1937,genre:"Self-help",language:"English",audience:"adult",sales:70000000,pop:78,blurb:"The granddaddy of the self-help and success genre."},
    {title:"The Diary of a Young Girl",artist:"Anne Frank",country:"Netherlands",year:1947,genre:"Memoir",language:"Dutch",audience:"all",sales:30000000,translations:70,pop:90,blurb:"Written in hiding in Amsterdam — the most enduring testimony of the Holocaust."},
    {title:"One Hundred Years of Solitude",artist:"Gabriel García Márquez",country:"Colombia",year:1967,genre:"Magical realism",language:"Spanish",audience:"adult",sales:50000000,translations:49,awards:"Nobel laureate 1982",awardCount:1,pop:93,blurb:"The masterpiece of magical realism — the Buendías of Macondo."},
    {title:"The Pilgrim's Progress",artist:"John Bunyan",country:"United Kingdom",year:1678,genre:"Religious allegory",language:"English",audience:"adult",translations:200,pop:76,blurb:"For centuries, the most-read book in English after the Bible."},
    {title:"Lolita",artist:"Vladimir Nabokov",country:"Russia",year:1955,genre:"Literary fiction",language:"English",audience:"adult",pop:80,blurb:"A scandalous, dazzling novel by the Russian-American master of prose."},

    // ===== Most-translated / fairy tales =====
    {title:"The Adventures of Pinocchio",artist:"Carlo Collodi",country:"Italy",year:1883,genre:"Children's",language:"Italian",audience:"children",sales:35000000,translations:300,pop:86,blurb:"The wooden puppet who wanted to be a real boy — one of the most-translated books ever."},
    {title:"Alice's Adventures in Wonderland",artist:"Lewis Carroll",country:"United Kingdom",year:1865,genre:"Children's / Fantasy",language:"English",audience:"all",translations:175,pop:90,blurb:"Down the rabbit hole — the apex of literary nonsense."},
    {title:"Fairy Tales of Hans Christian Andersen",artist:"Hans Christian Andersen",country:"Denmark",year:1837,genre:"Fairy tale",language:"Danish",audience:"children",translations:160,pop:88,blurb:"The Little Mermaid, The Ugly Duckling — Denmark's gift to childhood."},
    {title:"Grimm's Fairy Tales",artist:"Brothers Grimm",country:"Germany",year:1812,genre:"Fairy tale",language:"German",audience:"children",translations:160,pop:88,blurb:"Cinderella, Hansel & Gretel, Snow White — the dark roots of the fairy tale."},
    {title:"Twenty Thousand Leagues Under the Sea",artist:"Jules Verne",country:"France",year:1870,genre:"Science fiction",language:"French",audience:"all",pop:84,blurb:"Captain Nemo and the Nautilus — a founding work of science fiction."},
    {title:"The Communist Manifesto",artist:"Karl Marx & Friedrich Engels",country:"Germany",year:1848,genre:"Political",language:"German",audience:"adult",translations:100,pop:82,blurb:"'Workers of the world, unite!' — the most influential political pamphlet ever."},

    // ===== Comics, graphic novels & manga =====
    {title:"Astérix",artist:"René Goscinny & Albert Uderzo",country:"France",year:1959,genre:"Comic",language:"French",audience:"all",sales:380000000,translations:111,pop:90,blurb:"The indomitable Gauls — one of the best-selling comic series in the world."},
    {title:"The Adventures of Tintin",artist:"Hergé",country:"Belgium",year:1929,genre:"Comic",language:"French",audience:"all",sales:250000000,translations:70,pop:90,blurb:"Belgium's globe-trotting boy reporter and his dog Snowy."},
    {title:"One Piece",artist:"Eiichiro Oda",country:"Japan",year:1997,genre:"Manga",language:"Japanese",audience:"all",sales:520000000,pop:92,blurb:"The best-selling comic/manga series of all time."},
    {title:"Detective Conan",artist:"Gosho Aoyama",country:"Japan",year:1994,genre:"Manga",language:"Japanese",audience:"all",sales:270000000,pop:80,blurb:"A teenage detective shrunk to a child — a manga mystery juggernaut."},
    {title:"Dragon Ball",artist:"Akira Toriyama",country:"Japan",year:1984,genre:"Manga",language:"Japanese",audience:"all",sales:260000000,pop:88,blurb:"Goku's adventures that made manga and anime a global language."},
    {title:"Naruto",artist:"Masashi Kishimoto",country:"Japan",year:1999,genre:"Manga",language:"Japanese",audience:"all",sales:250000000,pop:86,blurb:"The ninja epic that conquered a generation."},
    {title:"Doraemon",artist:"Fujiko F. Fujio",country:"Japan",year:1969,genre:"Manga",language:"Japanese",audience:"children",sales:250000000,pop:82,blurb:"A robot cat from the future — Asia's most beloved children's manga."},
    {title:"Diary of a Wimpy Kid",artist:"Jeff Kinney",country:"United States",year:2007,genre:"Children's / Comic",language:"English",audience:"children",sales:275000000,pop:82,blurb:"Greg Heffley's cartoon diary — a modern children's mega-seller."},
    {title:"Maus",artist:"Art Spiegelman",country:"United States",year:1991,genre:"Graphic novel",language:"English",audience:"adult",awards:"Pulitzer Prize 1992",awardCount:1,pop:84,blurb:"The Holocaust told in mice and cats — the only graphic novel to win a Pulitzer."},
    {title:"Persepolis",artist:"Marjane Satrapi",country:"Iran",year:2000,genre:"Graphic memoir",language:"French",audience:"adult",pop:82,blurb:"Coming of age during the Iranian Revolution, in stark black and white."},
    {title:"Watchmen",artist:"Alan Moore & Dave Gibbons",country:"United Kingdom",year:1986,genre:"Graphic novel",language:"English",audience:"adult",awards:"Hugo Award 1988",awardCount:1,pop:84,blurb:"The graphic novel that made the world take comics seriously."},

    // ===== Children's classics =====
    {title:"The Very Hungry Caterpillar",artist:"Eric Carle",country:"United States",year:1969,genre:"Children's picture book",language:"English",audience:"children",sales:55000000,translations:66,pop:88,blurb:"A tiny caterpillar eats its way into millions of childhoods."},
    {title:"Where the Wild Things Are",artist:"Maurice Sendak",country:"United States",year:1963,genre:"Children's picture book",language:"English",audience:"children",sales:20000000,pop:86,blurb:"Let the wild rumpus start — the greatest picture book ever made."},
    {title:"Charlotte's Web",artist:"E. B. White",country:"United States",year:1952,genre:"Children's",language:"English",audience:"children",sales:45000000,pop:86,blurb:"A pig, a spider, and the best-selling children's paperback of all time."},
    {title:"Winnie-the-Pooh",artist:"A. A. Milne",country:"United Kingdom",year:1926,genre:"Children's",language:"English",audience:"children",sales:50000000,pop:88,blurb:"A bear of very little brain, beloved the world over."},
    {title:"Pippi Longstocking",artist:"Astrid Lindgren",country:"Sweden",year:1945,genre:"Children's",language:"Swedish",audience:"children",sales:65000000,translations:70,pop:86,blurb:"The strongest girl in the world — Sweden's anarchic heroine."},
    {title:"Finn Family Moomintroll",artist:"Tove Jansson",country:"Finland",year:1948,genre:"Children's",language:"Swedish",audience:"children",translations:50,pop:82,blurb:"The gentle Moomins of Finland's Moominvalley."},
    {title:"The Cat in the Hat",artist:"Dr. Seuss",country:"United States",year:1957,genre:"Children's",language:"English",audience:"children",sales:10000000,pop:84,blurb:"The rhyming chaos that taught the world to read."},
    {title:"Charlie and the Chocolate Factory",artist:"Roald Dahl",country:"United Kingdom",year:1964,genre:"Children's",language:"English",audience:"children",sales:20000000,pop:88,blurb:"A golden ticket into the world's most famous chocolate factory."},
    {title:"Matilda",artist:"Roald Dahl",country:"United Kingdom",year:1988,genre:"Children's",language:"English",audience:"children",pop:84,blurb:"A tiny genius with telekinesis and an enormous heart."},
    {title:"The Gruffalo",artist:"Julia Donaldson",country:"United Kingdom",year:1999,genre:"Children's picture book",language:"English",audience:"children",sales:13000000,pop:80,blurb:"A mouse outwits the woods' scariest monster."},
    {title:"The Tale of Peter Rabbit",artist:"Beatrix Potter",country:"United Kingdom",year:1902,genre:"Children's picture book",language:"English",audience:"children",sales:45000000,pop:84,blurb:"The mischievous bunny who started it all."},
    {title:"Heidi",artist:"Johanna Spyri",country:"Switzerland",year:1881,genre:"Children's",language:"German",audience:"children",translations:50,pop:82,blurb:"The orphan of the Swiss Alps — Switzerland's most famous story."},
    {title:"The Wonderful Wizard of Oz",artist:"L. Frank Baum",country:"United States",year:1900,genre:"Children's / Fantasy",language:"English",audience:"children",pop:86,blurb:"Follow the yellow brick road to America's homegrown fairy tale."},
    {title:"Anne of Green Gables",artist:"L. M. Montgomery",country:"Canada",year:1908,genre:"Children's",language:"English",audience:"children",sales:50000000,pop:84,blurb:"Canada's red-headed orphan, beloved from Prince Edward Island to Japan."},
    {title:"The Lion, the Witch and the Wardrobe",artist:"C. S. Lewis",country:"United Kingdom",year:1950,genre:"Fantasy / Children's",language:"English",audience:"children",sales:85000000,pop:88,blurb:"Through the wardrobe into Narnia."},
    {title:"Struwwelpeter",artist:"Heinrich Hoffmann",country:"Germany",year:1845,genre:"Children's",language:"German",audience:"children",pop:70,blurb:"Gleefully grim cautionary tales for German children."},
    {title:"Le Petit Nicolas",artist:"René Goscinny & Jean-Jacques Sempé",country:"France",year:1959,genre:"Children's",language:"French",audience:"children",pop:74,blurb:"The mischief of a French schoolboy and his gang."},

    // ===== Literary canon (Europe) =====
    {title:"War and Peace",artist:"Leo Tolstoy",country:"Russia",year:1869,genre:"Literary fiction",language:"Russian",audience:"adult",pop:92,blurb:"The towering epic of Russia and the Napoleonic wars."},
    {title:"Crime and Punishment",artist:"Fyodor Dostoevsky",country:"Russia",year:1866,genre:"Literary fiction",language:"Russian",audience:"adult",pop:90,blurb:"A murderer's tortured conscience — the psychological novel perfected."},
    {title:"Les Misérables",artist:"Victor Hugo",country:"France",year:1862,genre:"Historical fiction",language:"French",audience:"adult",pop:90,blurb:"Jean Valjean, Javert, and the barricades of Paris."},
    {title:"In Search of Lost Time",artist:"Marcel Proust",country:"France",year:1913,genre:"Literary fiction",language:"French",audience:"adult",pop:82,blurb:"A madeleine, and the longest great novel ever written."},
    {title:"The Divine Comedy",artist:"Dante Alighieri",country:"Italy",year:1320,genre:"Epic poetry",language:"Italian",audience:"adult",pop:90,blurb:"A journey through Hell, Purgatory and Paradise that forged the Italian language."},
    {title:"Ulysses",artist:"James Joyce",country:"Ireland",year:1922,genre:"Literary fiction",language:"English",audience:"adult",pop:86,blurb:"One Dublin day, retold as the modernist Everest."},
    {title:"The Trial",artist:"Franz Kafka",country:"Czech Republic",year:1925,genre:"Literary fiction",language:"German",audience:"adult",pop:84,blurb:"Arrested for a crime never named — the nightmare that gave us 'Kafkaesque'."},
    {title:"Pride and Prejudice",artist:"Jane Austen",country:"United Kingdom",year:1813,genre:"Romance",language:"English",audience:"all",sales:20000000,pop:92,blurb:"Elizabeth Bennet and Mr Darcy — the most beloved romance in English."},
    {title:"1984",artist:"George Orwell",country:"United Kingdom",year:1949,genre:"Dystopia",language:"English",audience:"adult",sales:30000000,pop:93,blurb:"Big Brother is watching — the dystopia that named our fears."},
    {title:"Animal Farm",artist:"George Orwell",country:"United Kingdom",year:1945,genre:"Satire",language:"English",audience:"adult",translations:70,pop:88,blurb:"All animals are equal, but some are more equal than others."},
    {title:"Brave New World",artist:"Aldous Huxley",country:"United Kingdom",year:1932,genre:"Dystopia",language:"English",audience:"adult",pop:84,blurb:"A pleasure-engineered future — the other great dystopia."},
    {title:"Frankenstein",artist:"Mary Shelley",country:"United Kingdom",year:1818,genre:"Horror / Science fiction",language:"English",audience:"adult",pop:88,blurb:"A teenager invented science fiction with a monster made of grief."},
    {title:"Dracula",artist:"Bram Stoker",country:"Ireland",year:1897,genre:"Horror",language:"English",audience:"adult",pop:86,blurb:"The Transylvanian count who created the modern vampire."},
    {title:"The Odyssey",artist:"Homer",country:"Greece",year:-700,genre:"Epic poetry",language:"Greek",audience:"all",translations:100,pop:92,blurb:"Odysseus's ten-year voyage home — the West's founding adventure."},
    {title:"The Iliad",artist:"Homer",country:"Greece",year:-750,genre:"Epic poetry",language:"Greek",audience:"adult",pop:88,blurb:"The wrath of Achilles and the fall of Troy."},
    {title:"Don Juan / Faust",artist:"Johann Wolfgang von Goethe",country:"Germany",year:1808,genre:"Drama",language:"German",audience:"adult",pop:80,blurb:"Goethe's pact with the devil — the summit of German letters."},

    // ===== Americas =====
    {title:"The Great Gatsby",artist:"F. Scott Fitzgerald",country:"United States",year:1925,genre:"Literary fiction",language:"English",audience:"adult",sales:30000000,pop:88,blurb:"The green light, the Jazz Age, the American Dream gone sour."},
    {title:"Moby-Dick",artist:"Herman Melville",country:"United States",year:1851,genre:"Literary fiction",language:"English",audience:"adult",pop:84,blurb:"Call me Ishmael — the great American whale."},
    {title:"Beloved",artist:"Toni Morrison",country:"United States",year:1987,genre:"Literary fiction",language:"English",audience:"adult",awards:"Pulitzer Prize 1988; Nobel laureate 1993",awardCount:2,pop:84,blurb:"A ghost story of slavery and motherhood from a Nobel laureate."},
    {title:"The Grapes of Wrath",artist:"John Steinbeck",country:"United States",year:1939,genre:"Literary fiction",language:"English",audience:"adult",awards:"Pulitzer Prize 1940; Nobel laureate 1962",awardCount:2,pop:82,blurb:"The Joads flee the Dust Bowl — America's Depression epic."},
    {title:"Gone with the Wind",artist:"Margaret Mitchell",country:"United States",year:1936,genre:"Historical fiction",language:"English",audience:"adult",sales:30000000,awards:"Pulitzer Prize 1937",awardCount:1,pop:84,blurb:"Scarlett O'Hara and the Old South in flames."},
    {title:"The Handmaid's Tale",artist:"Margaret Atwood",country:"Canada",year:1985,genre:"Dystopia",language:"English",audience:"adult",pop:84,blurb:"Offred's Gilead — a dystopia that keeps coming true."},
    {title:"Ficciones",artist:"Jorge Luis Borges",country:"Argentina",year:1944,genre:"Literary fiction",language:"Spanish",audience:"adult",pop:82,blurb:"Labyrinths, infinite libraries — Borges reinvented the short story."},
    {title:"The House of the Spirits",artist:"Isabel Allende",country:"Chile",year:1982,genre:"Magical realism",language:"Spanish",audience:"adult",pop:80,blurb:"Three generations of the Trueba family — Chile's magical-realist saga."},
    {title:"Pedro Páramo",artist:"Juan Rulfo",country:"Mexico",year:1955,genre:"Literary fiction",language:"Spanish",audience:"adult",pop:78,blurb:"A town of ghosts — the slim novel that seeded magical realism."},
    {title:"Dom Casmurro",artist:"Machado de Assis",country:"Brazil",year:1899,genre:"Literary fiction",language:"Portuguese",audience:"adult",pop:76,blurb:"Brazil's masterpiece of jealousy and unreliable memory."},

    // ===== Africa =====
    {title:"Things Fall Apart",artist:"Chinua Achebe",country:"Nigeria",year:1958,genre:"Literary fiction",language:"English",audience:"adult",sales:20000000,translations:57,pop:88,blurb:"The most widely read work of African literature."},
    {title:"Half of a Yellow Sun",artist:"Chimamanda Ngozi Adichie",country:"Nigeria",year:2006,genre:"Historical fiction",language:"English",audience:"adult",pop:80,blurb:"Love and war during Biafra's secession."},
    {title:"Cry, the Beloved Country",artist:"Alan Paton",country:"South Africa",year:1948,genre:"Literary fiction",language:"English",audience:"adult",pop:80,blurb:"A father's grief and a nation's — written on the eve of apartheid."},
    {title:"Disgrace",artist:"J. M. Coetzee",country:"South Africa",year:1999,genre:"Literary fiction",language:"English",audience:"adult",awards:"Booker Prize 1999; Nobel laureate 2003",awardCount:2,pop:78,blurb:"Post-apartheid reckoning from a double Booker winner."},
    {title:"The Cairo Trilogy",artist:"Naguib Mahfouz",country:"Egypt",year:1957,genre:"Literary fiction",language:"Arabic",audience:"adult",awards:"Nobel laureate 1988",awardCount:1,pop:80,blurb:"Three generations of a Cairo family, by the Arab world's Nobel laureate."},
    {title:"Season of Migration to the North",artist:"Tayeb Salih",country:"Sudan",year:1966,genre:"Literary fiction",language:"Arabic",audience:"adult",pop:74,blurb:"Often called the finest Arabic novel of the 20th century."},
    {title:"So Long a Letter",artist:"Mariama Bâ",country:"Senegal",year:1979,genre:"Literary fiction",language:"French",audience:"adult",pop:72,blurb:"A widow's letter — a landmark of African women's writing."},

    // ===== Asia & Middle East =====
    {title:"The Tale of Genji",artist:"Murasaki Shikibu",country:"Japan",year:1010,genre:"Classic literature",language:"Japanese",audience:"adult",pop:88,blurb:"Often called the world's first novel — written by a Heian court lady."},
    {title:"Norwegian Wood",artist:"Haruki Murakami",country:"Japan",year:1987,genre:"Literary fiction",language:"Japanese",audience:"adult",sales:12000000,pop:84,blurb:"The melancholy love story that made Murakami a global superstar."},
    {title:"Journey to the West",artist:"Wu Cheng'en",country:"China",year:1592,genre:"Epic / Fantasy",language:"Chinese",audience:"all",pop:86,blurb:"The Monkey King's pilgrimage — one of China's Four Classic Novels."},
    {title:"The Three-Body Problem",artist:"Liu Cixin",country:"China",year:2008,genre:"Science fiction",language:"Chinese",audience:"adult",awards:"Hugo Award 2015",awardCount:1,pop:80,blurb:"The first Asian novel to win the Hugo — Chinese sci-fi goes global."},
    {title:"The Mahabharata",artist:"Vyasa (attributed)",country:"India",year:-400,genre:"Epic poetry",language:"Sanskrit",audience:"all",pop:88,blurb:"The longest epic poem ever composed — the soul of Indian civilisation."},
    {title:"The God of Small Things",artist:"Arundhati Roy",country:"India",year:1997,genre:"Literary fiction",language:"English",audience:"adult",awards:"Booker Prize 1997",awardCount:1,pop:80,blurb:"A Kerala childhood shattered — a luminous Booker winner."},
    {title:"Gitanjali",artist:"Rabindranath Tagore",country:"India",year:1910,genre:"Poetry",language:"Bengali",audience:"adult",awards:"Nobel laureate 1913",awardCount:1,pop:78,blurb:"Devotional verse that won Asia its first Nobel in Literature."},
    {title:"Midnight's Children",artist:"Salman Rushdie",country:"India",year:1981,genre:"Magical realism",language:"English",audience:"adult",awards:"Booker Prize 1981 (Booker of Bookers)",awardCount:1,pop:82,blurb:"Children born at the stroke of India's independence."},
    {title:"One Thousand and One Nights",artist:"Anonymous",country:"Iraq",year:900,genre:"Folklore",language:"Arabic",audience:"all",translations:100,pop:90,blurb:"Scheherazade, Aladdin, Sinbad — the tales of the Islamic Golden Age."},
    {title:"The Epic of Gilgamesh",artist:"Anonymous (Mesopotamia)",country:"Iraq",year:-2100,genre:"Epic poetry",language:"Akkadian",audience:"adult",pop:82,blurb:"The oldest surviving great work of literature."},
    {title:"Shahnameh",artist:"Ferdowsi",country:"Iran",year:1010,genre:"Epic poetry",language:"Persian",audience:"all",pop:80,blurb:"The Persian 'Book of Kings' — 50,000 couplets that saved a language."},
    {title:"The Blind Owl",artist:"Sadegh Hedayat",country:"Iran",year:1937,genre:"Literary fiction",language:"Persian",audience:"adult",pop:72,blurb:"Iran's most famous modern novel — a feverish hallucination."},
    {title:"The Kite Runner",artist:"Khaled Hosseini",country:"Afghanistan",year:2003,genre:"Literary fiction",language:"English",audience:"adult",sales:31000000,pop:84,blurb:"Friendship and betrayal across Afghanistan's tragedies."},
    {title:"My Name Is Red",artist:"Orhan Pamuk",country:"Turkey",year:1998,genre:"Literary fiction",language:"Turkish",audience:"adult",awards:"Nobel laureate 2006",awardCount:1,pop:78,blurb:"A murder among Ottoman miniaturists, by Turkey's Nobel laureate."},

    // ===== Oceania =====
    {title:"The Thorn Birds",artist:"Colleen McCullough",country:"Australia",year:1977,genre:"Romance",language:"English",audience:"adult",sales:33000000,pop:80,blurb:"Forbidden love in the Australian outback — a global blockbuster."},
    {title:"Cloudstreet",artist:"Tim Winton",country:"Australia",year:1991,genre:"Literary fiction",language:"English",audience:"adult",pop:74,blurb:"Two battling families share a rambling Perth house — Australia's favourite novel."},
    {title:"The Book Thief",artist:"Markus Zusak",country:"Australia",year:2005,genre:"Historical fiction",language:"English",audience:"all",sales:16000000,pop:82,blurb:"Death narrates a girl's love of books in Nazi Germany."},
    {title:"The Bone People",artist:"Keri Hulme",country:"New Zealand",year:1984,genre:"Literary fiction",language:"English",audience:"adult",awards:"Booker Prize 1985",awardCount:1,pop:74,blurb:"A Māori-infused Booker winner unlike anything before it."}
  ],

  /* authors — metric is one of: books_sold, num_books, translations, awards */
  artists: [
    {name:"William Shakespeare",country:"United Kingdom",metric:"books_sold",value:4000000000,era:"1590s–1610s",genre:"Drama",blurb:"Estimated 2–4 billion copies sold — history's best-selling author."},
    {name:"Agatha Christie",country:"United Kingdom",metric:"books_sold",value:2000000000,era:"1920s–70s",genre:"Mystery",blurb:"The best-selling novelist of all time (Guinness World Records)."},
    {name:"Barbara Cartland",country:"United Kingdom",metric:"books_sold",value:1000000000,era:"1920s–2000s",genre:"Romance",blurb:"The 'Queen of Romance' — around a billion copies sold."},
    {name:"Danielle Steel",country:"United States",metric:"books_sold",value:800000000,era:"1970s–",genre:"Romance",blurb:"The best-selling author alive."},
    {name:"Harold Robbins",country:"United States",metric:"books_sold",value:750000000,era:"1940s–90s",genre:"Fiction",blurb:"One of the best-selling writers of all time."},
    {name:"Georges Simenon",country:"Belgium",metric:"books_sold",value:700000000,era:"1930s–80s",genre:"Mystery",blurb:"Belgium's prolific creator of Inspector Maigret."},
    {name:"Enid Blyton",country:"United Kingdom",metric:"books_sold",value:600000000,era:"1930s–60s",genre:"Children's",blurb:"The Famous Five and Noddy — a children's-book powerhouse."},
    {name:"J. K. Rowling",country:"United Kingdom",metric:"books_sold",value:600000000,era:"1997–",genre:"Fantasy",blurb:"Harry Potter — the best-selling book series in history."},
    {name:"Dr. Seuss",country:"United States",metric:"books_sold",value:600000000,era:"1937–1991",genre:"Children's",blurb:"Theodor Geisel — the rhyming king of children's literacy."},
    {name:"Nora Roberts",country:"United States",metric:"books_sold",value:500000000,era:"1980s–",genre:"Romance",blurb:"One of the most prolific and best-selling romance authors ever."},
    {name:"Leo Tolstoy",country:"Russia",metric:"books_sold",value:413000000,era:"1850s–1900s",genre:"Literary",blurb:"Russia's giant — War and Peace, Anna Karenina."},
    {name:"Stephen King",country:"United States",metric:"books_sold",value:400000000,era:"1970s–",genre:"Horror",blurb:"The master of modern horror."},
    {name:"R. L. Stine",country:"United States",metric:"books_sold",value:400000000,era:"1980s–",genre:"Children's horror",blurb:"Goosebumps — kid-friendly scares by the hundred-million."},
    {name:"Jin Yong",country:"China",metric:"books_sold",value:300000000,era:"1950s–70s",genre:"Wuxia",blurb:"The most-read Chinese author of the modern era."},
    {name:"Roald Dahl",country:"United Kingdom",metric:"books_sold",value:300000000,era:"1960s–90s",genre:"Children's",blurb:"The mischievous genius of children's fiction."},

    {name:"Barbara Cartland",country:"United Kingdom",metric:"num_books",value:723,era:"1920s–2000s",genre:"Romance",blurb:"Wrote ~723 books — among the most prolific authors ever."},
    {name:"Enid Blyton",country:"United Kingdom",metric:"num_books",value:762,era:"1930s–60s",genre:"Children's",blurb:"Published well over 700 books."},
    {name:"Isaac Asimov",country:"United States",metric:"num_books",value:500,era:"1950s–90s",genre:"Science fiction",blurb:"Wrote or edited around 500 books across every Dewey category."},
    {name:"Georges Simenon",country:"Belgium",metric:"num_books",value:400,era:"1930s–80s",genre:"Mystery",blurb:"Nearly 400 novels, many written in days."},

    {name:"Agatha Christie",country:"United Kingdom",metric:"translations",value:103,era:"1920s–70s",genre:"Mystery",blurb:"The most-translated individual author in the world."},
    {name:"Jules Verne",country:"France",metric:"translations",value:148,era:"1860s–1900s",genre:"Science fiction",blurb:"For decades the single most-translated author on Earth."},
    {name:"Hans Christian Andersen",country:"Denmark",metric:"translations",value:160,era:"1830s–70s",genre:"Fairy tale",blurb:"His fairy tales appear in over 150 languages."},
    {name:"William Shakespeare",country:"United Kingdom",metric:"translations",value:100,era:"1590s",genre:"Drama",blurb:"Performed and translated in virtually every literary language."},

    {name:"J. M. Coetzee",country:"South Africa",metric:"awards",value:4,era:"1970s–",genre:"Literary",blurb:"Two Booker Prizes and the Nobel — among the most decorated novelists."},
    {name:"Toni Morrison",country:"United States",metric:"awards",value:4,era:"1970s–2010s",genre:"Literary",blurb:"Pulitzer, Nobel and a Presidential Medal of Freedom."},
    {name:"Margaret Atwood",country:"Canada",metric:"awards",value:3,era:"1960s–",genre:"Literary",blurb:"Two Booker Prizes and a shelf of honours."},
    {name:"Kazuo Ishiguro",country:"United Kingdom",metric:"awards",value:3,era:"1980s–",genre:"Literary",blurb:"Booker Prize and Nobel laureate."},
    {name:"Gabriel García Márquez",country:"Colombia",metric:"awards",value:3,era:"1960s–2000s",genre:"Magical realism",blurb:"Nobel laureate and the face of magical realism."},
    {name:"Ernest Hemingway",country:"United States",metric:"awards",value:2,era:"1920s–50s",genre:"Literary",blurb:"Pulitzer and Nobel — the iceberg style incarnate."},
    {name:"Salman Rushdie",country:"India",metric:"awards",value:3,era:"1980s–",genre:"Literary",blurb:"Booker, Booker of Bookers, and countless honours."}
  ]
};
