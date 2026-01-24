import { notFound } from 'next/navigation';
import { getProjectById, getAllProjectIds } from '@/lib/projects';
import { Metadata } from 'next';
import AcademicProjectPage from '@/components/templates/AcademicProjectPage';
import type { AcademicProjectData } from '@/lib/types';

interface Params {
  id: string;
}

// Generate static params for all projects
export async function generateStaticParams() {
  const ids = await getAllProjectIds();
  return ids.map((id) => ({
    id,
  }));
}

// Generate metadata for each project
export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    return {
      title: '프로젝트를 찾을 수 없습니다',
    };
  }

  return {
    title: project.title,
    description: project.description,
  };
}

export default async function ProjectPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  const project = await getProjectById(id);

  if (!project) {
    notFound();
  }

  // Cast Project to AcademicProjectData as we are using the academic template
  const academicData = project as unknown as AcademicProjectData;

  return (
    <div className="min-h-screen bg-gray-50">
      <AcademicProjectPage data={academicData} />
    </div>
  );
}
