import { AllShowsAvatar } from "./_components/all-shows-avatar";
import { CreatorAvatar } from "./_components/creator-avatar";
import { EmptyCreatorsState } from "./_components/empty-creators-state";
import { getSubscribedCreators } from "./_lib/get-creators";

export default async function HomePage() {
  const creators = await getSubscribedCreators();

  if (creators.length === 0) {
    return <EmptyCreatorsState />;
  }

  return (
    <div className="home-root relative">
      <div className="home-blob home-blob-1" />
      <div className="home-blob home-blob-2" />
      <div className="home-blob home-blob-3" />
      <div className="home-blob home-blob-4" />
      <div className="home-blob home-blob-5" />

      <section className="relative z-10 px-6 pt-12 pb-6 text-center sm:pt-20 sm:pb-10">
        <h2 className="home-balloon-heading">
          <span className="balloon-word">Who</span>
          <span className="balloon-word">do</span>
          <span className="balloon-word">you</span>
          <span className="balloon-word">want</span>
          <span className="balloon-word">to</span>
          <span className="balloon-word">watch?</span>
        </h2>
      </section>

      <div className="relative z-10 px-6 pb-20 sm:px-10 lg:px-16">
        <div className="flex flex-wrap justify-center gap-x-6 gap-y-10 sm:gap-x-10 sm:gap-y-12 lg:gap-x-12">
          <AllShowsAvatar />
          {creators.map((creator, index) => (
            <CreatorAvatar key={creator.id} creator={creator} index={index} />
          ))}
        </div>
      </div>
    </div>
  );
}
