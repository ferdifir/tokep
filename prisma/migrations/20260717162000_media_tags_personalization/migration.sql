CREATE TABLE "Tag" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaTag" (
  "id" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MediaTag_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MediaView" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "mediaId" TEXT NOT NULL,
  "durationMs" INTEGER,
  "completed" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MediaView_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserTagAffinity" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "tagId" TEXT NOT NULL,
  "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserTagAffinity_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tag_name_key" ON "Tag"("name");
CREATE UNIQUE INDEX "Tag_slug_key" ON "Tag"("slug");
CREATE INDEX "Tag_name_idx" ON "Tag"("name");
CREATE UNIQUE INDEX "MediaTag_mediaId_tagId_key" ON "MediaTag"("mediaId", "tagId");
CREATE INDEX "MediaTag_tagId_mediaId_idx" ON "MediaTag"("tagId", "mediaId");
CREATE INDEX "MediaView_userId_mediaId_createdAt_idx" ON "MediaView"("userId", "mediaId", "createdAt");
CREATE INDEX "MediaView_mediaId_createdAt_idx" ON "MediaView"("mediaId", "createdAt");
CREATE UNIQUE INDEX "UserTagAffinity_userId_tagId_key" ON "UserTagAffinity"("userId", "tagId");
CREATE INDEX "UserTagAffinity_userId_score_idx" ON "UserTagAffinity"("userId", "score");

ALTER TABLE "MediaTag" ADD CONSTRAINT "MediaTag_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaTag" ADD CONSTRAINT "MediaTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaView" ADD CONSTRAINT "MediaView_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MediaView" ADD CONSTRAINT "MediaView_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserTagAffinity" ADD CONSTRAINT "UserTagAffinity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserTagAffinity" ADD CONSTRAINT "UserTagAffinity_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE CASCADE ON UPDATE CASCADE;
