CREATE TABLE "accounts" (
	"profile_id" varchar(40) PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text,
	"google_sub" text,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "auth_tokens" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"profile_id" varchar(40) NOT NULL,
	"purpose" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"used_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "case_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"content" text NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text,
	"published_at" timestamp with time zone,
	"image_path" text
);
--> statement-breakpoint
CREATE TABLE "cases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"claim" text NOT NULL,
	"kind" text DEFAULT 'real' NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"certainty" text,
	"conclusion" text,
	"embedding" vector(768),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "evidence" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"source_name" text NOT NULL,
	"source_url" text,
	"published_at" timestamp with time zone,
	"stance" text NOT NULL,
	"strength" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "feed_posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"kind" text NOT NULL,
	"region" text NOT NULL,
	"source_name" text NOT NULL,
	"author" text,
	"title" text,
	"body" text NOT NULL,
	"image_url" text,
	"reach" integer,
	"published_at" timestamp with time zone NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"case_id" uuid,
	"embedding" vector(768),
	CONSTRAINT "feed_posts_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "game_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" varchar(40) NOT NULL,
	"answers" jsonb NOT NULL,
	"score" integer NOT NULL,
	"total" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hearings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"profile_id" varchar(40) NOT NULL,
	"status" text DEFAULT 'pleaded' NOT NULL,
	"prosecution" jsonb NOT NULL,
	"defense" jsonb NOT NULL,
	"pleadings_source" text NOT NULL,
	"vote" text,
	"certainty" text,
	"findings" jsonb,
	"conclusion" text,
	"what_to_check" text,
	"verdict_source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"concluded_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "institution_notices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"source_url" text,
	"published_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"aliases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"channels" jsonb NOT NULL,
	"never" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "news_articles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"url" text NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"source_name" text NOT NULL,
	"published_at" timestamp with time zone,
	"embedding" vector(768),
	"harvested_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "news_articles_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" varchar(40) NOT NULL,
	"content" text NOT NULL,
	"embedding" vector(768),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" varchar(40) PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"role" text NOT NULL,
	"headline" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" varchar(64) PRIMARY KEY NOT NULL,
	"hits" integer NOT NULL,
	"reset_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "report_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"summary" text NOT NULL,
	"feed_post_id" uuid,
	"case_id" uuid,
	"embedding" vector(768),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"group_id" uuid NOT NULL,
	"reporter_id" varchar(40),
	"follow_token" varchar(32),
	"content" text DEFAULT '' NOT NULL,
	"url" text,
	"feed_post_id" uuid,
	"reason" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reports_group_reporter_unique" UNIQUE("group_id","reporter_id")
);
--> statement-breakpoint
CREATE TABLE "scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" varchar(40) NOT NULL,
	"kind" text NOT NULL,
	"file_name" text NOT NULL,
	"mime_type" text NOT NULL,
	"sha256" varchar(64) NOT NULL,
	"report" jsonb,
	"already_seen" jsonb,
	"reading" jsonb,
	"transcript" jsonb,
	"outcome" text,
	"ai_source" text,
	"case_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scenarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"position" integer NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"source_name" text NOT NULL,
	"image_path" text,
	"case_id" uuid,
	"clues" jsonb NOT NULL,
	"answer" text NOT NULL,
	"explanation" text NOT NULL,
	"reflex" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(64) PRIMARY KEY NOT NULL,
	"profile_id" varchar(40) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "version_explorations" (
	"version_id" uuid PRIMARY KEY NOT NULL,
	"case_id" uuid NOT NULL,
	"added_count" integer NOT NULL,
	"explored_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "version_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"case_id" uuid NOT NULL,
	"from_version_id" uuid NOT NULL,
	"to_version_id" uuid NOT NULL,
	"change_type" text NOT NULL,
	"note" text NOT NULL,
	"confidence" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "web_searches" (
	"case_id" uuid PRIMARY KEY NOT NULL,
	"status" text NOT NULL,
	"found_count" integer NOT NULL,
	"kept_count" integer NOT NULL,
	"contradicting_count" integer DEFAULT 0 NOT NULL,
	"searched_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "auth_tokens" ADD CONSTRAINT "auth_tokens_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "case_versions" ADD CONSTRAINT "case_versions_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "feed_posts" ADD CONSTRAINT "feed_posts_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "game_runs" ADD CONSTRAINT "game_runs_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "hearings" ADD CONSTRAINT "hearings_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "institution_notices" ADD CONSTRAINT "institution_notices_institution_id_institutions_id_fk" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notes" ADD CONSTRAINT "notes_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "report_groups" ADD CONSTRAINT "report_groups_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_group_id_report_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."report_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_id_profiles_id_fk" FOREIGN KEY ("reporter_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scans" ADD CONSTRAINT "scans_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "scenarios" ADD CONSTRAINT "scenarios_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "version_explorations" ADD CONSTRAINT "version_explorations_version_id_case_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."case_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "version_explorations" ADD CONSTRAINT "version_explorations_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "version_links" ADD CONSTRAINT "version_links_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "version_links" ADD CONSTRAINT "version_links_from_version_id_case_versions_id_fk" FOREIGN KEY ("from_version_id") REFERENCES "public"."case_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "version_links" ADD CONSTRAINT "version_links_to_version_id_case_versions_id_fk" FOREIGN KEY ("to_version_id") REFERENCES "public"."case_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "web_searches" ADD CONSTRAINT "web_searches_case_id_cases_id_fk" FOREIGN KEY ("case_id") REFERENCES "public"."cases"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_email_idx" ON "accounts" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_google_idx" ON "accounts" USING btree ("google_sub");--> statement-breakpoint
CREATE INDEX "case_versions_case_idx" ON "case_versions" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "cases_embedding_idx" ON "cases" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "evidence_case_idx" ON "evidence" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "feed_posts_published_idx" ON "feed_posts" USING btree ("published_at");--> statement-breakpoint
CREATE INDEX "feed_posts_region_idx" ON "feed_posts" USING btree ("region");--> statement-breakpoint
CREATE INDEX "game_runs_profile_idx" ON "game_runs" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "hearings_case_idx" ON "hearings" USING btree ("case_id");--> statement-breakpoint
CREATE INDEX "institution_notices_institution_idx" ON "institution_notices" USING btree ("institution_id");--> statement-breakpoint
CREATE INDEX "news_articles_embedding_idx" ON "news_articles" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "notes_profile_idx" ON "notes" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "notes_embedding_idx" ON "notes" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "report_groups_feed_post_idx" ON "report_groups" USING btree ("feed_post_id");--> statement-breakpoint
CREATE INDEX "report_groups_embedding_idx" ON "report_groups" USING hnsw ("embedding" vector_cosine_ops);--> statement-breakpoint
CREATE INDEX "reports_reporter_idx" ON "reports" USING btree ("reporter_id","created_at");--> statement-breakpoint
CREATE INDEX "reports_follow_token_idx" ON "reports" USING btree ("follow_token");--> statement-breakpoint
CREATE INDEX "sessions_profile_idx" ON "sessions" USING btree ("profile_id");--> statement-breakpoint
CREATE INDEX "version_links_case_idx" ON "version_links" USING btree ("case_id");