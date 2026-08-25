import { describe, it, expect } from 'vitest';
import detectFieldRoles from '../../utils/detectFieldRoles';

describe('detectFieldRoles', () => {
  it('returns an empty object for an empty array', () => {
    expect(detectFieldRoles([])).toEqual({});
  });

  it('returns an empty object for null or undefined', () => {
    expect(detectFieldRoles(null)).toEqual({});
    expect(detectFieldRoles(undefined)).toEqual({});
  });

  describe('title detection', () => {
    it('detects exact "title" field (case-insensitive)', () => {
      expect(detectFieldRoles(['title', 'body', 'image'])).toMatchObject({ title: 'title' });
      expect(detectFieldRoles(['Title', 'body'])).toMatchObject({ title: 'Title' });
    });

    it('detects exact "name" field when no title field exists', () => {
      expect(detectFieldRoles(['name', 'description'])).toMatchObject({ title: 'name' });
    });

    it('detects "heading" field when no title or name exists', () => {
      expect(detectFieldRoles(['heading', 'body'])).toMatchObject({ title: 'heading' });
    });

    it('prefers "title" over "name"', () => {
      expect(detectFieldRoles(['name', 'title'])).toMatchObject({ title: 'title' });
    });

    it('does not match partial field names like "postTitle" as title', () => {
      expect(detectFieldRoles(['postTitle', 'body'])).toMatchObject({ title: '' });
    });

    it('does not match "first_name" or "last_name" as title', () => {
      expect(detectFieldRoles(['first_name', 'last_name', 'body'])).toMatchObject({ title: '' });
    });
  });

  describe('description detection', () => {
    it('detects exact "description" field', () => {
      expect(detectFieldRoles(['title', 'description'])).toMatchObject({ desc: 'description' });
    });

    it('detects exact "desc" field', () => {
      expect(detectFieldRoles(['title', 'desc'])).toMatchObject({ desc: 'desc' });
    });

    it('detects exact "body" field', () => {
      expect(detectFieldRoles(['title', 'body'])).toMatchObject({ desc: 'body' });
    });

    it('detects exact "summary" field', () => {
      expect(detectFieldRoles(['title', 'summary'])).toMatchObject({ desc: 'summary' });
    });

    it('does not match partial field names like "mainContent" as desc', () => {
      expect(detectFieldRoles(['title', 'mainContent'])).toMatchObject({ desc: '' });
    });
  });

  describe('image detection', () => {
    it('detects exact "image" field', () => {
      expect(detectFieldRoles(['title', 'image'])).toMatchObject({ image: 'image' });
    });

    it('detects exact "thumbnail" field', () => {
      expect(detectFieldRoles(['title', 'thumbnail'])).toMatchObject({ image: 'thumbnail' });
    });

    it('does not match partial field names like "authorPhoto" as image', () => {
      expect(detectFieldRoles(['title', 'authorPhoto'])).toMatchObject({ image: '' });
    });

    it('does not match "image_url" as image', () => {
      expect(detectFieldRoles(['title', 'image_url'])).toMatchObject({ image: '' });
    });

    it('returns empty string when no image field exists', () => {
      expect(detectFieldRoles(['title', 'description'])).toMatchObject({ image: '' });
    });
  });

  describe('category detection', () => {
    it('detects exact "category" field', () => {
      expect(detectFieldRoles(['title', 'category'])).toMatchObject({ category: 'category' });
    });

    it('detects exact "tag" field', () => {
      expect(detectFieldRoles(['title', 'tag'])).toMatchObject({ category: 'tag' });
    });

    it('detects exact "type" field', () => {
      expect(detectFieldRoles(['title', 'type'])).toMatchObject({ category: 'type' });
    });

    it('returns empty string when no category field exists', () => {
      expect(detectFieldRoles(['title', 'description'])).toMatchObject({ category: '' });
    });
  });

  describe('meta detection', () => {
    it('detects exact "date" field', () => {
      expect(detectFieldRoles(['title', 'date'])).toMatchObject({ meta: 'date' });
    });

    it('detects exact "author" field', () => {
      expect(detectFieldRoles(['title', 'author'])).toMatchObject({ meta: 'author' });
    });

    it('detects exact "price" field', () => {
      expect(detectFieldRoles(['title', 'price'])).toMatchObject({ meta: 'price' });
    });

    it('returns empty string when no meta field exists', () => {
      expect(detectFieldRoles(['title', 'description'])).toMatchObject({ meta: '' });
    });
  });

  describe('link detection', () => {
    it('detects exact "url" field', () => {
      expect(detectFieldRoles(['title', 'url'])).toMatchObject({ link: 'url' });
    });

    it('detects exact "link" field', () => {
      expect(detectFieldRoles(['title', 'link'])).toMatchObject({ link: 'link' });
    });

    it('detects exact "slug" field', () => {
      expect(detectFieldRoles(['title', 'slug'])).toMatchObject({ link: 'slug' });
    });

    it('returns empty string when no link field exists', () => {
      expect(detectFieldRoles(['title', 'description', 'category'])).toMatchObject({ link: '' });
    });

    it('does not match "page_url" or "image_url" as link', () => {
      expect(detectFieldRoles(['title', 'page_url', 'image_url'])).toMatchObject({ link: '' });
    });
  });

  it('handles a realistic schema with multiple fields', () => {
    const fields = ['id', 'title', 'description', 'image', 'category', 'date', 'url'];
    const roles = detectFieldRoles(fields);
    expect(roles).toEqual({
      title:    'title',
      desc:     'description',
      image:    'image',
      category: 'category',
      meta:     'date',
      link:     'url',
    });
  });
});
