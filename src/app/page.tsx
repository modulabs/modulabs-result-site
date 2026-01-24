import Link from 'next/link';
import { getAllProjects } from '@/lib/projects';

export default async function HomePage() {
  const allProjects = await getAllProjects();
  const githubCount = allProjects.filter((p) => p.type === 'github').length;
  const paperCount = allProjects.filter((p) => p.type === 'paper').length;
  const videoCount = allProjects.filter((p) => p.type === 'video').length;

  // Group projects by year (descending order)
  const projectsByYear = allProjects.reduce((acc, project) => {
    const year = project.year || new Date(project.createdAt).getFullYear().toString();
    if (!acc[year]) {
      acc[year] = [];
    }
    acc[year].push(project);
    return acc;
  }, {} as Record<string, typeof allProjects>);

  // Sort years in descending order
  const sortedYears = Object.keys(projectsByYear).sort((a, b) => b.localeCompare(a));

  return (
    <>
      {/* Hero Section */}
      <section className="gradient-hero py-20 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div
            className="absolute top-20 left-20 w-72 h-72 rounded-full blur-3xl"
            style={{ backgroundColor: '#F7585C' }}
          ></div>
          <div
            className="absolute bottom-20 right-20 w-96 h-96 rounded-full blur-3xl"
            style={{ backgroundColor: '#FF8A72' }}
          ></div>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="animate-fade-in">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 backdrop-blur-sm border border-primary/20 mb-6">
              <span className="w-2 h-2 rounded-full animate-pulse bg-primary"></span>
              <span className="text-sm text-gray-700">연구 결과물을 공개합니다</span>
            </div>
            <div className="mb-6">
              <img
                src="/logo.png"
                alt="모두의연구소"
                className="h-16 md:h-20 w-auto"
              />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-gray-900">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                LAB 결과물
              </span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-2xl">
              연구실에서 생산된 다양한 산출 결과물들을 만나보세요.
              <br />
              오픈소스 프로젝트부터 학술 논문까지, 우리의 연구 성과를 공유합니다.
            </p>

            <div className="mb-8">
              <a
                href="https://modulabs.co.kr/lab-proposals"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white transition-all duration-200 bg-primary border border-transparent rounded-lg shadow-lg hover:bg-primary/90 hover:shadow-xl hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                연구하러가기
                <svg
                  className="w-5 h-5 ml-2 -mr-1"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M17 8l4 4m0 0l-4 4m4-4H3"
                  />
                </svg>
              </a>
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-sm border border-primary/20">
                <img
                  src="/github-logo.svg"
                  alt="GitHub"
                  className="w-5 h-5"
                />
                <span className="text-gray-700">GitHub 저장소</span>
                <span className="font-semibold text-primary">{githubCount}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-sm border border-accent/20">
                <svg
                  className="w-5 h-5 text-accent"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <span className="text-gray-700">논문</span>
                <span className="font-semibold text-accent">{paperCount}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/60 backdrop-blur-sm border border-red-500/20">
                <img
                  src="/youtube-logo.png"
                  alt="YouTube"
                  className="w-5 h-5"
                />
                <span className="text-gray-700">YouTube</span>
                <span className="font-semibold text-red-600">{videoCount}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Projects by Year */}
      <section className="py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          {allProjects.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <p>등록된 결과물이 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-16">
              {sortedYears.map((year, yearIndex) => (
                <div key={year} className="animate-fade-in" style={{ animationDelay: `${yearIndex * 100}ms` }}>
                  {/* Year Header */}
                  <div className="flex items-center gap-4 mb-8">
                    <h2 className="text-3xl font-bold text-gray-900">
                      {year}
                    </h2>
                    <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent"></div>
                    <span className="text-sm text-gray-500">
                      {projectsByYear[year].length}개의 결과물
                    </span>
                  </div>

                  {/* Projects Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {projectsByYear[year].map((project, index) => (
                      <ProjectCard key={project.id} project={project} index={index} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}

function ProjectCard({
  project,
  index,
}: {
  project: {
    id: string;
    title: string;
    description: string;
    type: 'github' | 'paper' | 'video';
    authors: string[];
    createdAt: Date;
    year?: string;
  };
  index: number;
}) {
  const staggerClass = `stagger-${(index % 6) + 1}` as const;

  return (
    <Link
      href={`/projects/${project.id}`}
      className={`card-hover bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden opacity-0 animate-fade-in ${staggerClass}`}
    >
      <div className="p-6">
        <div className="flex items-center justify-between mb-4">
          {project.type === 'github' ? (
            <span className="tag-github text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
              <img
                src="/github-logo.svg"
                alt="GitHub"
                className="w-3.5 h-3.5"
              />
              GitHub
            </span>
          ) : project.type === 'video' ? (
            <span className="tag-video text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1 bg-red-600">
              <img
                src="/youtube-logo.png"
                alt="YouTube"
                className="w-3.5 h-3.5"
              />
              YouTube
            </span>
          ) : (
            <span className="tag-paper text-white text-xs font-medium px-3 py-1 rounded-full flex items-center gap-1">
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              논문
            </span>
          )}
          <span className="text-xs text-gray-400">
            {project.year || new Date(project.createdAt).getFullYear().toString()}
          </span>
        </div>
        <h3 className="text-lg font-semibold mb-2 line-clamp-2 text-gray-900">
          {project.title}
        </h3>
        <p className="text-gray-600 text-sm line-clamp-3 mb-4">
          {project.description}
        </p>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <svg
              className="w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
              />
            </svg>
            <span className="truncate max-w-[150px]">
              {project.authors && project.authors.length > 0
                ? project.authors.join(', ')
                : '저자 정보 없음'}
            </span>
          </div>
          <svg
            className="w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </Link>
  );
}
