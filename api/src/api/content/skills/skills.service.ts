import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ContentCacheService } from 'src/common/helpers/cache/contentCache.service';
import { PrismaService } from 'src/common/helpers/prisma/prisma.service';
import { RevalidationService } from 'src/common/helpers/revalidation/revalidation.service';
import { slugify } from 'src/common/utils/content.util';
import type { SkillDto } from '../common/content.dto';

/** Skills are not translated (tech names), only ordered and categorized. */
@Injectable()
export class SkillsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly cache: ContentCacheService,
        private readonly revalidation: RevalidationService,
    ) {}

    list() {
        return this.cache.wrap('skills', ['skills'], () =>
            this.prisma.skill.findMany({
                orderBy: [{ category: 'asc' }, { order: 'asc' }],
                select: {
                    id: true,
                    key: true,
                    name: true,
                    category: true,
                    level: true,
                    icon: true,
                    order: true,
                    featured: true,
                },
            }),
        );
    }

    async create(dto: SkillDto) {
        if (!dto.name || !dto.category) {
            throw new BadRequestException({ i18nKey: 'content.MISSING_FIELDS', fields: ['name', 'category'] });
        }
        const key = slugify(dto.name);
        if (await this.prisma.skill.findUnique({ where: { key } })) {
            throw new ConflictException({
                i18nKey: 'content.SLUG_TAKEN',
                args: { slug: key, locale: '*' },
                fields: ['name'],
            });
        }
        const max = await this.prisma.skill.aggregate({ _max: { order: true } });
        const skill = await this.prisma.skill.create({
            data: {
                key,
                name: dto.name,
                category: dto.category,
                level: dto.level ?? null,
                icon: dto.icon ?? null,
                featured: dto.featured ?? false,
                order: (max._max.order ?? -1) + 1,
            },
        });
        await this.changed();
        return skill;
    }

    async update(id: string, dto: SkillDto) {
        await this.ensure(id);
        const skill = await this.prisma.skill.update({
            where: { id },
            data: { name: dto.name, category: dto.category, level: dto.level, icon: dto.icon, featured: dto.featured },
        });
        await this.changed();
        return skill;
    }

    async reorder(ids: string[]) {
        await this.prisma.$transaction(
            ids.map((id, order) => this.prisma.skill.update({ where: { id }, data: { order } })),
        );
        await this.changed();
        return this.prisma.skill.findMany({ orderBy: [{ category: 'asc' }, { order: 'asc' }] });
    }

    async remove(id: string) {
        await this.ensure(id);
        await this.prisma.skill.delete({ where: { id } });
        await this.changed();
        return { id, deleted: true };
    }

    private async ensure(id: string) {
        if (!(await this.prisma.skill.count({ where: { id } })))
            throw new NotFoundException({ i18nKey: 'content.NOT_FOUND' });
    }

    private changed() {
        return this.revalidation.contentChanged(['skills', 'projects']);
    }
}
