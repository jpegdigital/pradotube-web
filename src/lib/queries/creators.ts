import { createClient } from "@/lib/supabase/browser";

/* ─── Types ─── */

export interface ChannelRow {
	youtube_id: string;
	title: string;
	description: string | null;
	custom_url: string | null;
	thumbnail_url: string | null;
	banner_url: string | null;
	subscriber_count: number;
	video_count: number;
	view_count: number;
	creator_id: string | null;
	display_order: number | null;
	priority: number;
	date_range_override: string | null;
	min_duration_override: number | null;
	max_videos_override: number | null;
	sync_mode: string;
}

export interface Creator {
	id: string;
	name: string;
	slug: string;
	thumbnail_url: string | null;
	display_order: number;
	priority: number;
	channels: ChannelRow[];
}

export interface CreatorsWithChannelsResponse {
	creators: Creator[];
	ungrouped: ChannelRow[];
}

const CHANNEL_FIELDS =
	"youtube_id, title, description, custom_url, thumbnail_url, banner_url, " +
	"subscriber_count, video_count, view_count, creator_id, display_order, " +
	"priority, date_range_override, min_duration_override, max_videos_override, sync_mode";

/* ─── Full nested query (admin panel) ─── */

export async function fetchCreatorsWithChannels(): Promise<CreatorsWithChannelsResponse> {
	const supabase = createClient();
	const [creatorsResult, channelsResult] = await Promise.all([
		supabase
			.from("creators")
			.select("id, name, slug, thumbnail_url, display_order, priority")
			.order("sort_name", { ascending: true }),
		supabase
			.from("channels")
			.select(CHANNEL_FIELDS)
			.order("display_order", { ascending: true }),
	]);

	if (creatorsResult.error) throw new Error("Failed to load creators");
	if (channelsResult.error) throw new Error("Failed to load channels");

	const channels = (channelsResult.data || []) as unknown as ChannelRow[];
	const ungrouped: ChannelRow[] = [];
	const byCreator = new Map<string, ChannelRow[]>();
	for (const ch of channels) {
		if (ch.creator_id == null) {
			ungrouped.push(ch);
			continue;
		}
		const arr = byCreator.get(ch.creator_id);
		if (arr) arr.push(ch);
		else byCreator.set(ch.creator_id, [ch]);
	}

	const creators: Creator[] = (creatorsResult.data || []).map((c) => ({
		...c,
		channels: byCreator.get(c.id) ?? [],
	})) as Creator[];

	return { creators, ungrouped };
}
