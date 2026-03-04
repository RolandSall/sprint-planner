CREATE TABLE "teams" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pis" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"team_id" uuid NOT NULL,
	"name" text NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sprints" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pi_id" uuid NOT NULL,
	"name" text NOT NULL,
	"order" integer NOT NULL,
	"capacity" integer NOT NULL,
	"start_date" date,
	"end_date" date
);
--> statement-breakpoint
CREATE TABLE "features" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pi_id" uuid NOT NULL,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"color" text,
	"release_id" uuid
);
--> statement-breakpoint
CREATE TABLE "stories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"feature_id" uuid NOT NULL,
	"sprint_id" uuid,
	"external_id" text NOT NULL,
	"title" text NOT NULL,
	"estimation" real NOT NULL,
	"external_dependency_sprint" integer
);
--> statement-breakpoint
CREATE TABLE "story_dependencies" (
	"story_id" uuid NOT NULL,
	"depends_on_story_id" uuid NOT NULL,
	CONSTRAINT "story_dependencies_story_id_depends_on_story_id_pk" PRIMARY KEY("story_id","depends_on_story_id")
);
--> statement-breakpoint
CREATE TABLE "pi_releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pi_id" uuid NOT NULL,
	"name" text NOT NULL,
	"date" date NOT NULL,
	"sprint_id" uuid
);
--> statement-breakpoint
ALTER TABLE "pis" ADD CONSTRAINT "pis_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sprints" ADD CONSTRAINT "sprints_pi_id_pis_id_fk" FOREIGN KEY ("pi_id") REFERENCES "public"."pis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "features" ADD CONSTRAINT "features_pi_id_pis_id_fk" FOREIGN KEY ("pi_id") REFERENCES "public"."pis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "features" ADD CONSTRAINT "features_release_id_pi_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "public"."pi_releases"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_feature_id_features_id_fk" FOREIGN KEY ("feature_id") REFERENCES "public"."features"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_dependencies" ADD CONSTRAINT "story_dependencies_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_dependencies" ADD CONSTRAINT "story_dependencies_depends_on_story_id_stories_id_fk" FOREIGN KEY ("depends_on_story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pi_releases" ADD CONSTRAINT "pi_releases_pi_id_pis_id_fk" FOREIGN KEY ("pi_id") REFERENCES "public"."pis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pi_releases" ADD CONSTRAINT "pi_releases_sprint_id_sprints_id_fk" FOREIGN KEY ("sprint_id") REFERENCES "public"."sprints"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "sprints_pi_id_idx" ON "sprints" USING btree ("pi_id");--> statement-breakpoint
CREATE INDEX "features_pi_id_idx" ON "features" USING btree ("pi_id");--> statement-breakpoint
CREATE INDEX "stories_feature_id_idx" ON "stories" USING btree ("feature_id");--> statement-breakpoint
CREATE INDEX "stories_sprint_id_idx" ON "stories" USING btree ("sprint_id");--> statement-breakpoint
CREATE INDEX "story_deps_story_id_idx" ON "story_dependencies" USING btree ("story_id");--> statement-breakpoint
CREATE INDEX "pi_releases_pi_id_idx" ON "pi_releases" USING btree ("pi_id");