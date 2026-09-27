import { Module } from '@nestjs/common';
import {
    ContentPreviewController,
    EducationAdminController,
    ExperienceAdminController,
    PagesAdminController,
    PagesPublicController,
    ProfileAdminController,
    ProfilePublicController,
    ProjectsAdminController,
    ProjectsPublicController,
    ResumePublicController,
    SkillsAdminController,
    SkillsPublicController,
} from './content.controllers';
import { ContentOverviewController } from './overview/overview.controller';
import { ContentOverviewService } from './overview/overview.service';
import { PagesService } from './pages/pages.service';
import {
    PostsAdminController,
    PostsPreviewController,
    PostsPublicController,
    TagsAdminController,
    TagsPublicController,
} from './posts/posts.controllers';
import { PostsService } from './posts/posts.service';
import { PublishSchedulerService } from './posts/publishScheduler.service';
import { TagsService } from './posts/tags.service';
import { ProfileService } from './profile/profile.service';
import { ProjectsService } from './projects/projects.service';
import { ResumeService } from './resume/resume.service';
import { SkillsService } from './skills/skills.service';

/** Public + admin content APIs (PLAN §6/§7). Cache + revalidation come from the global ContentCacheModule. */
@Module({
    controllers: [
        ProfilePublicController,
        ProjectsPublicController,
        ResumePublicController,
        SkillsPublicController,
        PagesPublicController,
        PostsPublicController,
        TagsPublicController,
        PostsPreviewController,
        ContentPreviewController,
        ProfileAdminController,
        ProjectsAdminController,
        ExperienceAdminController,
        EducationAdminController,
        SkillsAdminController,
        PagesAdminController,
        PostsAdminController,
        TagsAdminController,
        ContentOverviewController,
    ],
    providers: [
        PostsService,
        TagsService,
        ProjectsService,
        ResumeService,
        SkillsService,
        PagesService,
        ProfileService,
        ContentOverviewService,
        PublishSchedulerService,
    ],
    exports: [PostsService, PublishSchedulerService],
})
export class ContentModule {}
