export type StopId =
	| "about"
	| "projects"
	| "games"
	| "contact"
	| "admin"
	| "coming-soon"
	| "coming-soon-2"
	| "coming-soon-3";

export const MAP_WIDTH = 1087;
export const MAP_HEIGHT = 721;

export type Position = {
	x: number;
	y: number;
};

export type WalkZone = {
	id: string;
	x: number;
	y: number;
	width: number;
	height: number;
};

export type TownMapBackgroundId = "background" | "background-2";

export type TownMapVariant = {
	id: TownMapBackgroundId;
	label: string;
	imageSrc: string;
	width: number;
	height: number;
	startPosition: Position;
	walkZones: WalkZone[];
};

export type LinkEntry = {
	label: string;
	url: string;
};

export type ProfileContent = {
	name: string;
	title: string;
	tagline: string;
	intro: string;
	quickStats: Array<{
		label: string;
		value: string;
	}>;
};

export type AboutSection = {
	title: string;
	body: string;
	points: string[];
};

export type ShowcaseEntry = {
	title: string;
	category: string;
	meta: string;
	role: string;
	blurb: string;
	highlights: string[];
	links: LinkEntry[];
	featured?: boolean;
};

export type ContactEntry = {
	label: string;
	value: string;
	href: string;
	note: string;
};

export type DashboardContent = {
	intro: string;
	toolStatus: Array<{
		label: string;
		value: string;
	}>;
	publishQueue: string[];
	notes: string[];
};

export type PortfolioContent = {
	profile: ProfileContent;
	about: {
		lead: string;
		sections: AboutSection[];
	};
	projects: ShowcaseEntry[];
	games: ShowcaseEntry[];
	contact: ContactEntry[];
	dashboard: DashboardContent;
};

export type TownStop = {
	id: StopId;
	order: string;
	title: string;
	shortLabel: string;
	detailMode?: StopId;
	subtitle: string;
	preview: string;
	recommendation: string;
	outline: Position[];
	infoAnchor: Position;
	door: Position;
	exit: Position;
};

export const walkZones: WalkZone[] = [
	{ id: "north-west", x: 170, y: 170, width: 235, height: 210 },
	{ id: "center-left", x: 392, y: 250, width: 182, height: 170 },
	{ id: "center-right", x: 615, y: 185, width: 168, height: 150 },
	{ id: "lake-side", x: 710, y: 320, width: 178, height: 176 },
	{ id: "south-center", x: 410, y: 405, width: 220, height: 108 },
	{ id: "south-east", x: 792, y: 455, width: 200, height: 160 },
];

export const townStops: TownStop[] = [
	{
		id: "about",
		order: "01",
		title: "Professor House",
		shortLabel: "About Me",
		subtitle:
			"A short introduction to Le Minh Quang, the design interests behind the work, and the kind of teams he wants to build for.",
		preview: "Best first stop if you want the overview before diving into the projects.",
		recommendation: "Start here for the personal snapshot.",
		outline: [
			{ x: 190.8804473876953, y: 192.76806640625 },
			{ x: 189.96495056152344, y: 294.99444580078125 },
			{ x: 366.7816162109375, y: 294.74169921875 },
			{ x: 355.4474792480469, y: 174.5396270751953 },
			{ x: 206.19952392578125, y: 182.41119384765625 },
		],
		infoAnchor: { x: 214.4361572265625, y: 208.85379028320312 },
		door: { x: 263.7352294921875, y: 282.3179626464844 },
		exit: { x: 265.11688232421875, y: 315.5312805175781 },
	},
	{
		id: "admin",
		order: "02",
		title: "PC Center",
		shortLabel: "Admin",
		subtitle:
			"A studio-desk preview for curating featured work, copy direction, and contact priorities.",
		preview: "An interactive concept for the portfolio's behind-the-scenes view.",
		recommendation: "Open this for the curator-side presentation layer.",
		outline: [
			{ x: 472.9423828125, y: 261.8597717285156 },
			{ x: 527.0716552734375, y: 262.1153259277344 },
			{ x: 547.5719604492188, y: 267.136474609375 },
			{ x: 550.8717041015625, y: 359.3935546875 },
			{ x: 447.7859802246094, y: 354.2656555175781 },
			{ x: 448.0218505859375, y: 273.9661865234375 },
		],
		infoAnchor: { x: 445, y: 228 },
		door: { x: 471.265869140625, y: 326.20550537109375 },
		exit: { x: 471.09735107421875, y: 370.31207275390625 },
	},
	{
		id: "projects",
		order: "03",
		title: "Project Hall",
		shortLabel: "Projects",
		subtitle:
			"Flagship work across team projects, showcase pieces, and design writing, gathered into one curated board.",
		preview: "Open the strongest case studies and supporting links from a single place.",
		recommendation: "Best second stop after the profile.",
		outline: [
			{ x: 657.6951904296875, y: 190.93145751953125 },
			{ x: 691.9391479492188, y: 180.42855834960938 },
			{ x: 731.80810546875, y: 185.5255584716797 },
			{ x: 726.8739624023438, y: 257.47607421875 },
			{ x: 661.764404296875, y: 256.6644592285156 },
			{ x: 655.6058349609375, y: 230.56729125976562 },
		],
		infoAnchor: { x: 646, y: 169 },
		door: { x: 678.8358154296875, y: 246.0745086669922 },
		exit: { x: 680.1528930664062, y: 280.9166259765625 },
	},
	{
		id: "games",
		order: "04",
		title: "Game Corner",
		shortLabel: "Games",
		subtitle:
			"Playable prototypes, side builds, and smaller experiments collected into a quick-browse shelf.",
		preview: "A faster way to sample range, iteration, and smaller releases.",
		recommendation: "Best stop if you want the hands-on experiments.",
		outline: [
			{ x: 726.1241455078125, y: 316.92138671875 },
			{ x: 759.1886596679688, y: 324.4278564453125 },
			{ x: 763.274658203125, y: 372.758056640625 },
			{ x: 758.9443359375, y: 402.4273681640625 },
			{ x: 691.3887329101562, y: 400.3380126953125 },
			{ x: 689.8217163085938, y: 326.9131774902344 },
		],
		infoAnchor: { x: 716, y: 318 },
		door: { x: 710.701171875, y: 391.9356994628906 },
		exit: { x: 710.695556640625, y: 427.9881896972656 },
	},
	{
		id: "contact",
		order: "05",
		title: "Link House",
		shortLabel: "Contact",
		subtitle: "The cleanest way to continue the conversation after the tour.",
		preview: "Direct channels for professional follow-up, playtesting, and browsing more work.",
		recommendation: "Finish here when you want the next step.",
		outline: [
			{ x: 851.4400634765625, y: 451.6730651855469 },
			{ x: 895.8275146484375, y: 460.4179992675781 },
			{ x: 897.3804321289062, y: 543.2224731445312 },
			{ x: 844.3267822265625, y: 542.3125610351562 },
			{ x: 801.534423828125, y: 536.9347534179688 },
			{ x: 801.8236694335938, y: 466.697265625 },
		],
		infoAnchor: { x: 806, y: 468 },
		door: { x: 821.5657958984375, y: 520.29296875 },
		exit: { x: 823.1328125, y: 554.3319091796875 },
	},
	{
		id: "coming-soon",
		order: "06",
		title: "Workshop Annex",
		shortLabel: "Coming Soon",
		detailMode: "coming-soon",
		subtitle: "A reserved room for the next project drop, experiment, or writing piece.",
		preview: "Future work will land here once the next branch of the portfolio is ready.",
		recommendation: "Check back here for the next update.",
		outline: [
			{ x: 561.0740966796875, y: 427.8646240234375 },
			{ x: 599.0530395507812, y: 406.5442810058594 },
			{ x: 632.8589477539062, y: 426.7665710449219 },
			{ x: 633.1846923828125, y: 499.3686218261719 },
			{ x: 563.663330078125, y: 497.5685119628906 },
		],
		infoAnchor: { x: 518, y: 436 },
		door: { x: 582.849365234375, y: 484.43145751953125 },
		exit: { x: 619.2219848632812, y: 522.2474975585938 },
	},
	{
		id: "coming-soon-2",
		order: "07",
		title: "Upper Route Annex",
		shortLabel: "Coming Soon",
		detailMode: "coming-soon",
		subtitle: "A second reserved room for upcoming showcase work or a new route branch.",
		preview: "Kept open for another future piece once the next expansion is ready.",
		recommendation: "A placeholder for the portfolio's next branch.",
		outline: [
			{ x: 839.77734375, y: 162.03443908691406 },
			{ x: 910.0344848632812, y: 168.5411834716797 },
			{ x: 911.0510864257812, y: 250.8176727294922 },
			{ x: 857.9917602539062, y: 255.97364807128906 },
			{ x: 858.8089599609375, y: 239.8373565673828 },
			{ x: 818.7687377929688, y: 240.41867065429688 },
			{ x: 818.8446044921875, y: 173.94146728515625 },
		],
		infoAnchor: { x: 827, y: 164 },
		door: { x: 839.2887573242188, y: 229.10418701171875 },
		exit: { x: 838.6512451171875, y: 267.33587646484375 },
	},
	{
		id: "coming-soon-3",
		order: "08",
		title: "South Route Annex",
		shortLabel: "Coming Soon",
		detailMode: "coming-soon",
		subtitle: "A third reserved room for later case studies, writing, or another experiment shelf.",
		preview: "Space held for another future addition to the town.",
		recommendation: "Reserved for a later portfolio expansion.",
		outline: [
			{ x: 242.47386169433594, y: 412.29840087890625 },
			{ x: 276.82452392578125, y: 394.21038818359375 },
			{ x: 311.7059631347656, y: 412.6915588378906 },
			{ x: 309.0212707519531, y: 481.26934814453125 },
			{ x: 242.62831115722656, y: 480.0786437988281 },
		],
		infoAnchor: { x: 212, y: 435 },
		door: { x: 263.7857666015625, y: 471.2803649902344 },
		exit: { x: 262.93206787109375, y: 508.0433349609375 },
	},
];

const aboutStartStop = townStops.find((stop) => stop.id === "about")!;

export const startPosition: Position = {
	x: aboutStartStop.exit.x,
	y: aboutStartStop.exit.y + 18,
};

export const defaultTownMapBackgroundId: TownMapBackgroundId = "background";

export const townMapVariants: TownMapVariant[] = [
	{
		id: "background",
		label: "Background 1",
		imageSrc: "/background.png",
		width: MAP_WIDTH,
		height: MAP_HEIGHT,
		startPosition,
		walkZones,
	},
	{
		id: "background-2",
		label: "Background 2",
		imageSrc: "/background-2.png",
		width: 1024,
		height: 981,
		startPosition: {
			x: 512,
			y: 490,
		},
		walkZones: [],
	},
];

export function getTownMapVariant(backgroundId: TownMapBackgroundId) {
	return (
		townMapVariants.find((variant) => variant.id === backgroundId) ??
		townMapVariants[0]
	);
}

export const portfolioContent: PortfolioContent = {
	profile: {
		name: "Le Minh Quang",
		title: "Game Design Student",
		tagline:
			"Game design work shaped around player feeling, narrative texture, and readable interactive systems.",
		intro:
			"A walkable portfolio for quickly meeting the work: profile first, flagship projects next, playable experiments after that, then a direct way to get in touch.",
		quickStats: [
			{ label: "Focus", value: "Game design, narrative direction, player experience" },
			{
				label: "Background",
				value: "Student projects, public showcase work, and released prototypes",
			},
			{
				label: "Strength",
				value: "Turning early ideas into readable, player-facing concepts",
			},
			{ label: "Looking For", value: "Teams that value clarity, tone, and curiosity" },
		],
	},
	about: {
		lead:
			"I study game design through the lens of player emotion, narrative framing, and how small system choices shape the whole feel of an experience. The work here moves from student showcase pieces to smaller experiments and writing that sharpen that point of view.",
		sections: [
			{
				title: "Design Focus",
				body:
					"I care most about how a game communicates itself to the player: what it asks you to notice, how it guides your attention, and how mechanics support mood instead of fighting it.",
				points: [
					"Player experience stays at the center of every concept and presentation choice.",
					"Narrative tone and system clarity are treated as part of the same design problem.",
					"I like work that feels approachable on the surface but layered underneath.",
				],
			},
			{
				title: "How I Work",
				body:
					"My projects usually start with a strong hook, then get shaped through iteration, feedback, and a lot of attention to how someone will actually read or play the thing for the first time.",
				points: [
					"I enjoy framing systems so collaborators and players can understand the intent quickly.",
					"Public presentation matters because it changes how the work is received.",
					"I treat prototypes, showcase pages, and writing as connected parts of one practice.",
				],
			},
			{
				title: "Current Direction",
				body:
					"Right now I am interested in projects that mix playful presentation with stronger structure: work that feels memorable, but still gives collaborators and recruiters the information they need fast.",
				points: [
					"Flagship team projects show how I frame and communicate larger ideas.",
					"Smaller prototypes reveal range, iteration habits, and experimentation.",
					"Design writing helps show the critical lens behind the practical work.",
				],
			},
		],
	},
	projects: [
		{
			title: "Dungeons & Diners",
			category: "Flagship Team Project",
			meta: "Itch / Video / Drive",
			role: "System framing, collaborative design, public presentation",
			blurb:
				"A collaborative showcase project that best represents how I like to package systems, tone, and public-facing presentation into one clear piece.",
			highlights: [
				"Presented through a playable build, a video walkthrough, and supporting documentation.",
				"Useful as a front-door project because it shows both concept clarity and polish.",
				"The clearest example here of teamwork paired with a strong outward presentation.",
			],
			links: [
				{ label: "Itch.io", url: "https://labeurre.itch.io/dungeons-diners" },
				{ label: "YouTube", url: "https://youtu.be/d8Px4o2P_NM" },
				{ label: "Drive Folder", url: "https://drive.google.com/drive/folders/1EnSq5KwC6q9ZVxNx_FL0jwfucNW6lRog" },
			],
			featured: true,
		},
		{
			title: "Pokemon Opal Rose",
			category: "RMIT Showcase",
			meta: "Year 1",
			role: "Pokemon-inspired concept development and showcase packaging",
			blurb:
				"A first-year showcase piece built around a Pokemon-inspired concept, with a clear emphasis on theme and presentation.",
			highlights: [
				"Published through the RMIT Vietnam showcase.",
				"Shows an early interest in building around familiar worlds and readable hooks.",
				"Pairs well with later work because it makes progression easy to see.",
			],
			links: [
				{
					label: "RMIT Showcase",
					url: "https://www.rmitvn-showcase.com/scd-games-y1/en/pokemon-opal-rose",
				},
			],
		},
		{
			title: "Soul Symphony",
			category: "RMIT Showcase",
			meta: "Year 2",
			role: "Narrative and player-experience focused showcase work",
			blurb:
				"A later showcase project with stronger narrative framing and a more mature player-experience focus.",
			highlights: [
				"Published in the Year 2 RMIT showcase lineup.",
				"Helps show how my work developed from concept-first ideas into more refined presentation.",
				"A strong comparison point against earlier showcase work.",
			],
			links: [
				{
					label: "RMIT Showcase",
					url: "https://www.rmitvn-showcase.com/scd-games-y2/en/soul-symphony",
				},
			],
		},
		{
			title: "Grotesque in Games",
			category: "Research / Design Writing",
			meta: "Itch Publication",
			role: "Design commentary and thematic analysis",
			blurb:
				"A design writing piece focused on the grotesque in games and what that aesthetic does to player perception.",
			highlights: [
				"Adds a critical and reflective counterpart to the playable work.",
				"Shows how I think about mood, theme, and player response beyond implementation.",
				"Useful for understanding the theory behind the rest of the portfolio.",
			],
			links: [
				{ label: "Itch.io", url: "https://labeurre.itch.io/grotesque-in-games" },
				{ label: "YouTube", url: "https://youtu.be/7OsP4kumoto?si=PMsR9GgIl1yqTrjI" },
			],
		},
	],
	games: [
		{
			title: "THLIPSI",
			category: "Playable Experiment",
			meta: "Itch Build",
			role: "Compact concept execution",
			blurb:
				"A smaller public build that shows how I handle compact concepts without overexplaining them.",
			highlights: [
				"Easy to open quickly as a short playable sample.",
				"Useful for seeing how the portfolio extends beyond major showcase pieces.",
				"Helps round out the work with a tighter, more focused experiment.",
			],
			links: [{ label: "Itch.io", url: "https://labeurre.itch.io/thlipsi" }],
		},
		{
			title: "Project Mira",
			category: "Prototype",
			meta: "Itch Build",
			role: "Systems-focused student experimentation",
			blurb:
				"A prototype that leans more directly into systems experimentation and student iteration.",
			highlights: [
				"Adds range beyond the more polished showcase projects.",
				"Represents a more exploratory side of the work.",
				"Useful for conversations about iteration and mechanics-first thinking.",
			],
			links: [{ label: "Itch.io", url: "https://shumoyed.itch.io/project-mira" }],
		},
		{
			title: "Pokemon Mystery Mansion",
			category: "Fan-inspired Build",
			meta: "Itch Build",
			role: "Theme-driven game concept with a familiar reference point",
			blurb:
				"A fan-inspired build that uses a familiar Pokemon reference point to support a more playful concept.",
			highlights: [
				"Good example of how I work with recognizable themes without losing personality.",
				"Acts as a lighter branch after the more formal project showcases.",
				"Often the kind of project that starts more playful design conversations.",
			],
			links: [
				{
					label: "Itch.io",
					url: "https://labeurre.itch.io/pokemon-mystery-mansion",
				},
			],
		},
		{
			title: "Triumphant",
			category: "Side Project",
			meta: "Itch Build",
			role: "Compact release and iteration practice",
			blurb:
				"A smaller release built as part of ongoing iteration practice and experimentation.",
			highlights: [
				"Shows release discipline on a smaller scale.",
				"Useful for seeing the work between major showcase moments.",
				"Keeps the experiment shelf varied in pace and scope.",
			],
			links: [{ label: "Itch.io", url: "https://labeurre.itch.io/triumphant" }],
		},
		{
			title: "Dungeon Farmer",
			category: "Side Project",
			meta: "Itch Build",
			role: "Mechanics-first experimentation",
			blurb:
				"A mechanics-first experiment that highlights breadth in theme and prototyping interests.",
			highlights: [
				"Shows range in mechanics and subject matter.",
				"Useful for visitors who want a deeper pass through the smaller work.",
				"Adds another angle on how I explore gameplay ideas.",
			],
			links: [{ label: "Itch.io", url: "https://labeurre.itch.io/dungeon-farmer" }],
		},
		{
			title: "Deliver-E-Co",
			category: "Other Project",
			meta: "Itch / Drive",
			role: "Supporting build with companion process material",
			blurb:
				"A supporting build with both a playable page and process material, useful for seeing how I document work around the game itself.",
			highlights: [
				"Connects a playable build to a companion documentation folder.",
				"Useful for anyone who wants more process context alongside the release.",
				"Rounds out the shelf with a more documentation-friendly example.",
			],
			links: [
				{ label: "Itch.io", url: "https://theprimordial.itch.io/deliver-e-co" },
				{
					label: "Drive Folder",
					url: "https://drive.google.com/drive/folders/1igbrlfQE893BC_UeyFkhLVtXKaHLsPTp?usp=drive_link",
				},
			],
		},
	],
	contact: [
		{
			label: "LinkedIn",
			value: "linkedin.com/in/quang-le-minh-701699360",
			href: "https://www.linkedin.com/in/quang-le-minh-701699360/",
			note: "Best route for professional outreach and recruiter follow-up.",
		},
		{
			label: "Bluesky",
			value: "bsky.app/profile/shumoyed.bsky.social",
			href: "https://bsky.app/profile/shumoyed.bsky.social",
			note: "A lighter, more casual channel to stay in touch with the work.",
		},
		{
			label: "Itch Collection",
			value: "labeurre.itch.io",
			href: "https://labeurre.itch.io/",
			note: "Direct access to playable releases and experiment pages.",
		},
		{
			label: "Portfolio Site",
			value: "Main portfolio hub",
			href: "https://lmquang.uwu.ai/",
			note: "Direct route back to the broader portfolio home.",
		},
	],
	dashboard: {
		intro:
			"A studio-style preview for reshuffling featured work, trying new hero copy, and checking how the portfolio reads from the curator side.",
		toolStatus: [
			{ label: "Access", value: "Preview gate" },
			{ label: "State", value: "Session only" },
			{ label: "Content", value: "Curated local data" },
			{ label: "Mode", value: "Presentation concept" },
		],
		publishQueue: [
			"Refresh the profile headline before the next share-out",
			"Compare Dungeons & Diners and Soul Symphony as the featured project",
			"Rotate one game shelf pick higher for faster browsing",
			"Check which contact link should be treated as the primary CTA",
		],
		notes: [
			"Designed to preview how the portfolio could be curated from a lightweight control room.",
			"Good for testing copy direction, featured order, and contact emphasis.",
			"Useful as a presentation layer for the broader town concept.",
		],
	},
};
