import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});

export const fetchPlaceReviews = async (placeId: string, apiKey: string) => {
  try {
    const response = await client.placeDetails({
      params: {
        place_id: placeId,
        key: apiKey,
        fields: ['reviews', 'name'],
        // @ts-ignore - 'ja'は実際には有効な言語設定ですが、型定義が制限的です
        language: 'ja',
      },
    });

    if (response.data.result) {
      return {
        placeName: response.data.result.name,
        reviews: response.data.result.reviews?.map(review => ({
          author: review.author_name,
          rating: review.rating,
          comment: review.text,
          created_at: review.time,
        })) || [],
      };
    }

    return null;
  } catch (error) {
    console.error('Google Places API error:', error);
    throw new Error('レビューの取得に失敗しました');
  }
}; 