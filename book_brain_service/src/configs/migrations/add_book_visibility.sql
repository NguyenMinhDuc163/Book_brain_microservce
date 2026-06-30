BEGIN;

-- Copyright/publication approval belongs to the whole book. Chapters inherit
-- this state and must never be exposed independently from their parent book.
ALTER TABLE public.books
    ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.books.is_visible IS
    'TRUE only after the book is approved for publication in client APIs';

CREATE INDEX IF NOT EXISTS idx_books_visible_created_at
    ON public.books (created_at DESC)
    WHERE is_visible = TRUE;

CREATE OR REPLACE VIEW public.book_rankings_view AS
SELECT
    b.book_id,
    b.views,
    ROUND(COALESCE((SELECT AVG(br.rating) FROM public.book_reviews br WHERE br.book_id = b.book_id), 0), 2) AS avg_rating,
    (SELECT COUNT(*) FROM public.book_reviews br WHERE br.book_id = b.book_id) AS review_count,
    (SELECT COUNT(*) FROM public.user_favorites uf WHERE uf.book_id = b.book_id) AS favorite_count,
    ROUND(
        b.views
        + (SELECT COUNT(*) FROM public.user_favorites uf WHERE uf.book_id = b.book_id) * 5
        + COALESCE((SELECT AVG(br.rating) FROM public.book_reviews br WHERE br.book_id = b.book_id), 0) * 10,
        2
    ) AS ranking_score,
    b.category_id,
    RANK() OVER (ORDER BY (
        b.views
        + (SELECT COUNT(*) FROM public.user_favorites uf WHERE uf.book_id = b.book_id) * 5
        + COALESCE((SELECT AVG(br.rating) FROM public.book_reviews br WHERE br.book_id = b.book_id), 0) * 10
    ) DESC) AS overall_rank
FROM public.books b
WHERE b.is_visible = TRUE;

CREATE OR REPLACE VIEW public.author_rankings_view AS
SELECT
    a.author_id,
    COUNT(DISTINCT b.book_id) AS total_books,
    COALESCE(SUM(b.views), 0) AS total_views,
    ROUND(COALESCE(AVG(NULLIF(b.rating::text, '')::numeric), 0), 2) AS avg_rating,
    COALESCE((
        SELECT COUNT(*)
        FROM public.user_favorites uf
        JOIN public.books b2 ON b2.book_id = uf.book_id
        WHERE b2.author_id = a.author_id AND b2.is_visible = TRUE
    ), 0) AS total_favorites,
    ROUND(
        COUNT(DISTINCT b.book_id) * 2
        + COALESCE(SUM(b.views), 0) * 0.01
        + COALESCE((
            SELECT COUNT(*)
            FROM public.user_favorites uf
            JOIN public.books b2 ON b2.book_id = uf.book_id
            WHERE b2.author_id = a.author_id AND b2.is_visible = TRUE
        ), 0) * 5
        + COALESCE(AVG(NULLIF(b.rating::text, '')::numeric), 0) * 8,
        2
    ) AS author_score,
    RANK() OVER (ORDER BY (
        COUNT(DISTINCT b.book_id) * 2
        + COALESCE(SUM(b.views), 0) * 0.01
        + COALESCE((
            SELECT COUNT(*)
            FROM public.user_favorites uf
            JOIN public.books b2 ON b2.book_id = uf.book_id
            WHERE b2.author_id = a.author_id AND b2.is_visible = TRUE
        ), 0) * 5
        + COALESCE(AVG(NULLIF(b.rating::text, '')::numeric), 0) * 8
    ) DESC) AS overall_rank
FROM public.authors a
LEFT JOIN public.books b
    ON b.author_id = a.author_id AND b.is_visible = TRUE
GROUP BY a.author_id
HAVING COUNT(b.book_id) > 0;

COMMIT;
