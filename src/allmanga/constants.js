export const BASE_URL = 'https://allmanga.to';
export const API_URL = 'https://api.allanime.day/api';
export const BLOG_URL = 'https://blog.allanime.day';
export const PLAYER_URL = 'https://allanime.day';

export const SEARCH_QUERY = `query($search: SearchInput, $limit: Int, $page: Int, $translationType: VaildTranslationTypeEnumType, $countryOrigin: VaildCountryOriginEnumType) {
  shows(search: $search, limit: $limit, page: $page, translationType: $translationType, countryOrigin: $countryOrigin) {
    edges {
      _id
      name
      englishName
      nativeName
      thumbnail
      type
    }
  }
}`;

export const EPISODE_QUERY = `query($showId: String!, $translationType: VaildTranslationTypeEnumType!, $episodeString: String!) {
  episode(showId: $showId, translationType: $translationType, episodeString: $episodeString) {
    episodeString
    sourceUrls
  }
}`;
