import {
	ChatMessage,
	ChatMessageLite,
	DriveFile,
	DriveFolder,
	Note,
	Notification,
	Signin,
	User,
	UserDetailed,
	UserDetailedNotMe,
	UserLite,
} from './autogen/models.js';
import {
	AnnouncementCreated,
	EmojiAdded, EmojiDeleted,
	EmojiUpdated,
	PageEvent,
	QueueStats,
	QueueStatsLog,
	ServerStats,
	ServerStatsLog,
} from './entities.js';

export type Channels = {
	main: {
		params: null;
		events: {
			notification: (payload: Notification) => void;
			mention: (payload: Note) => void;
			reply: (payload: Note) => void;
			renote: (payload: Note) => void;
			follow: (payload: UserDetailedNotMe) => void; // 自分が他人をフォローしたとき
			followed: (payload: UserDetailed | UserLite) => void; // 他人が自分をフォローしたとき
			unfollow: (payload: UserDetailed) => void; // 自分が他人をフォロー解除したとき
			meUpdated: (payload: UserDetailed) => void;
			pageEvent: (payload: PageEvent) => void;
			urlUploadFinished: (payload: { marker: string; file: DriveFile; }) => void;
			readAllNotifications: () => void;
			unreadNotification: (payload: Notification) => void;
			notificationFlushed: () => void;
			newChatMessage: (payload: ChatMessage) => void;
			readAllAnnouncements: () => void;
			myTokenRegenerated: () => void;
			signin: (payload: Signin) => void;
			registryUpdated: (payload: {
				scope?: string[];
				key: string;
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				value: any | null;
			}) => void;
			driveFileCreated: (payload: DriveFile) => void;
			receiveFollowRequest: (payload: User) => void;
			announcementCreated: (payload: AnnouncementCreated) => void;
		};
		receives: null;
	};
	homeTimeline: {
		params: {
			withRenotes?: boolean;
			withFiles?: boolean;
		};
		events: {
			note: (payload: Note) => void;
		};
		receives: null;
	};
	localTimeline: {
		params: {
			withRenotes?: boolean;
			withReplies?: boolean;
			withFiles?: boolean;
		};
		events: {
			note: (payload: Note) => void;
		};
		receives: null;
	};
	hybridTimeline: {
		params: {
			withRenotes?: boolean;
			withReplies?: boolean;
			withFiles?: boolean;
		};
		events: {
			note: (payload: Note) => void;
		};
		receives: null;
	};
	globalTimeline: {
		params: {
			withRenotes?: boolean;
			withFiles?: boolean;
		};
		events: {
			note: (payload: Note) => void;
		};
		receives: null;
	};
	userList: {
		params: {
			listId: string;
			withFiles?: boolean;
			withRenotes?: boolean;
		};
		events: {
			note: (payload: Note) => void;
		};
		receives: null;
	};
	hashtag: {
		params: {
			q: string[][];
		};
		events: {
			note: (payload: Note) => void;
		};
		receives: null;
	};
	roleTimeline: {
		params: {
			roleId: string;
		};
		events: {
			note: (payload: Note) => void;
		};
		receives: null;
	};
	antenna: {
		params: {
			antennaId: string;
		};
		events: {
			note: (payload: Note) => void;
		};
		receives: null;
	};
	channel: {
		params: {
			channelId: string;
		};
		events: {
			note: (payload: Note) => void;
		};
		receives: null;
	};
	drive: {
		params: null;
		events: {
			fileCreated: (payload: DriveFile) => void;
			fileDeleted: (payload: DriveFile['id']) => void;
			fileUpdated: (payload: DriveFile) => void;
			folderCreated: (payload: DriveFolder) => void;
			folderDeleted: (payload: DriveFolder['id']) => void;
			folderUpdated: (payload: DriveFolder) => void;
		};
		receives: null;
	};
	serverStats: {
		params: null;
		events: {
			stats: (payload: ServerStats) => void;
			statsLog: (payload: ServerStatsLog) => void;
		};
		receives: {
			requestLog: {
				id: string | number;
				length: number;
			};
		};
	};
	queueStats: {
		params: null;
		events: {
			stats: (payload: QueueStats) => void;
			statsLog: (payload: QueueStatsLog) => void;
		};
		receives: {
			requestLog: {
				id: string | number;
				length: number;
			};
		};
	};
	admin: {
		params: null;
		events: {
			newAbuseUserReport: {
				id: string;
				targetUserId: string;
				reporterId: string;
				comment: string;
			}
		};
		receives: null;
	};
	chatUser: {
		params: {
			otherId: string;
		};
		events: {
			message: (payload: ChatMessageLite) => void;
			deleted: (payload: ChatMessageLite['id']) => void;
			react: (payload: {
				reaction: string;
				user?: UserLite;
				messageId: ChatMessageLite['id'];
			}) => void;
			unreact: (payload: {
				reaction: string;
				user?: UserLite;
				messageId: ChatMessageLite['id'];
			}) => void;
			read: (payload: {
				messageId: ChatMessageLite['id'];
				readerId: User['id'];
			}) => void;
			typing: (payload: {
				userId: User['id'];
				user?: UserLite;
			}) => void;
			typingStop: (payload: {
				userId: User['id'];
			}) => void;
			drawingStroke: (payload: {
				id: string;
				userId: User['id'];
				userName: string;
				points: Array<{ x: number; y: number; pressure?: number }>;
				tool: 'pen' | 'eraser' | 'eyedropper';
				color: string;
				strokeWidth: number;
				opacity: number;
				timestamp: number;
				layer?: number;
			}) => void;
			drawingProgress: (payload: {
				id?: string;
				userId?: User['id'];
				points: Array<{ x: number; y: number; pressure?: number }>;
				tool: 'pen' | 'eraser' | 'eyedropper';
				color: string;
				strokeWidth?: number;
				opacity?: number;
				isComplete?: boolean;
				layer?: number;
				timestamp?: number;
			}) => void;
			cursorMove: (payload: {
				userId: User['id'];
				userName: string;
				x: number;
				y: number;
				timestamp: number;
			}) => void;
			clearCanvas: (payload: {
				userId: User['id'];
				userName?: string;
				timestamp: number;
				layer?: number;
			}) => void;
			undoStroke: (payload: {
				userId: User['id'];
				userName?: string;
				strokeId?: string;
				timestamp: number;
				layer?: number;
			}) => void;
			redoStroke: (payload: {
				userId: User['id'];
				userName?: string;
				strokeId?: string;
				timestamp: number;
				layer?: number;
			}) => void;
		};
		receives: {
			read: {
				id: ChatMessageLite['id'];
			};
			typing: {
				roomId?: string;
			};
			typingStop: {
				roomId?: string;
			};
			drawingStroke: {
				points: Array<{ x: number; y: number; pressure?: number }>;
				tool: 'pen' | 'eraser' | 'eyedropper';
				color: string;
				strokeWidth?: number;
				opacity?: number;
				layer?: number;
			};
			drawingProgress: {
				points: Array<{ x: number; y: number; pressure?: number }>;
				tool: 'pen' | 'eraser' | 'eyedropper';
				color: string;
				strokeWidth?: number;
				opacity?: number;
				isComplete?: boolean;
				layer?: number;
			};
			cursorMove: {
				x: number;
				y: number;
			};
			clearCanvas: {
				layer?: number;
			} | null;
			undoStroke: {
				layer?: number;
				strokeId?: string;
			};
			redoStroke: {
				layer?: number;
				strokeId?: string;
			};
			canvasRasterized: {
				imageData: string;
				timestamp: number;
			};
		};
	};
	chatRoom: {
		params: {
			roomId: string;
		};
		events: {
			message: (payload: ChatMessageLite) => void;
			deleted: (payload: ChatMessageLite['id']) => void;
			react: (payload: {
				reaction: string;
				user?: UserLite;
				messageId: ChatMessageLite['id'];
			}) => void;
			unreact: (payload: {
				reaction: string;
				user?: UserLite;
				messageId: ChatMessageLite['id'];
			}) => void;
			read: (payload: {
				messageId: ChatMessageLite['id'];
				readerId: User['id'];
			}) => void;
			typing: (payload: {
				userId: User['id'];
				user?: UserLite;
			}) => void;
			typingStop: (payload: {
				userId: User['id'];
			}) => void;
			drawingStroke: (payload: {
				id: string;
				userId: User['id'];
				userName: string;
				points: Array<{ x: number; y: number; pressure?: number }>;
				tool: 'pen' | 'eraser' | 'eyedropper';
				color: string;
				strokeWidth: number;
				opacity: number;
				timestamp: number;
				layer?: number;
			}) => void;
			drawingProgress: (payload: {
				id?: string;
				userId?: User['id'];
				points: Array<{ x: number; y: number; pressure?: number }>;
				tool: 'pen' | 'eraser' | 'eyedropper';
				color: string;
				strokeWidth?: number;
				opacity?: number;
				isComplete?: boolean;
				layer?: number;
				timestamp?: number;
			}) => void;
			cursorMove: (payload: {
				userId: User['id'];
				userName: string;
				x: number;
				y: number;
				timestamp: number;
			}) => void;
			clearCanvas: (payload: {
				userId: User['id'];
				userName?: string;
				timestamp: number;
				layer?: number;
			}) => void;
			undoStroke: (payload: {
				userId: User['id'];
				userName: string;
				strokeId?: string;
				timestamp: number;
				layer?: number;
			}) => void;
			redoStroke: (payload: {
				userId: User['id'];
				userName: string;
				strokeId?: string;
				timestamp: number;
				layer?: number;
			}) => void;
		};
		receives: {
			read: {
				id: ChatMessageLite['id'];
			};
			typing: {
				roomId?: string;
			};
			typingStop: {
				roomId?: string;
			};
			drawingStroke: {
				points: Array<{ x: number; y: number; pressure?: number }>;
				tool: 'pen' | 'eraser' | 'eyedropper';
				color: string;
				strokeWidth?: number;
				opacity?: number;
				layer?: number;
			};
			drawingProgress: {
				points: Array<{ x: number; y: number; pressure?: number }>;
				tool: 'pen' | 'eraser' | 'eyedropper';
				color: string;
				strokeWidth?: number;
				opacity?: number;
				isComplete?: boolean;
				layer?: number;
			};
			cursorMove: {
				x: number;
				y: number;
			};
			clearCanvas: null | {
				layer?: number;
			};
			undoStroke: {
				userId?: User['id'];
				timestamp: number;
				layer?: number;
				strokeId?: string;
			};
			redoStroke: {
				userId?: User['id'];
				timestamp: number;
				layer?: number;
				strokeId?: string;
			};
			canvasRasterized: {
				imageData: string;
				timestamp: number;
			};
		};
	};
};

export type NoteUpdatedEvent = { id: Note['id'] } & ({
	type: 'reacted';
	body: {
		reaction: string;
		emoji?: {
			name: string;
			url: string;
		} | null;
		userId: User['id'];
	};
} | {
	type: 'unreacted';
	body: {
		reaction: string;
		userId: User['id'];
	};
} | {
	type: 'deleted';
	body: {
		deletedAt: string;
	};
} | {
	type: 'pollVoted';
	body: {
		choice: number;
		userId: User['id'];
	};
});

export type BroadcastEvents = {
	noteUpdated: (payload: NoteUpdatedEvent) => void;
	emojiAdded: (payload: EmojiAdded) => void;
	emojiUpdated: (payload: EmojiUpdated) => void;
	emojiDeleted: (payload: EmojiDeleted) => void;
	announcementCreated: (payload: AnnouncementCreated) => void;
};
