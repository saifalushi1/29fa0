const express = require('express');
const { Post, UserPost } = require('../db/models');
const { Op } = require('sequelize');

const router = express.Router();

/**
 * Create a new blog post
 * req.body is expected to contain {text: required(string), tags: optional(Array<string>)}
 */
router.post('/', async (req, res, next) => {
  try {
    // Validation
    if (!req.user) {
      return res.sendStatus(401);
    }

    const { text, tags } = req.body;

    if (!text) {
      return res
        .status(400)
        .json({ error: 'Must provide text for the new post' });
    }

    // Create new post
    const values = {
      text,
    };
    if (tags) {
      values.tags = tags.join(',');
    }
    const post = await Post.create(values);
    await UserPost.create({
      userId: req.user.id,
      postId: post.id,
    });

    res.json({ post });
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const authorIds = req.query.authorIds;
    const authsplit = authorIds.split(',');
    const authArr = authsplit.map((id) => parseInt(id));
    const sortBy = req.query.sortBy || 'id';
    const direction = req.query.direction || 'asc';

    if (!req.user) {
      return res.status(401).redirect('/login');
    }
    // Require String for authorIds
    if (!authorIds) {
      return res.status(400).json({ error: 'Must Provide authorId(s)' });
    }

    /* For edge cases I would implement some conditionals Ex:
     (use regex to check if authorIds contains anything other than a number)
     (if the field they entered does not match a list in the model yell at the user and tell them to enter it right)
     */

     /*
     Created a single function that retrevies the user requested data but I  haven't used sequilize before
     and could't figure out how to remove the Post key and didn't want to spend to much time smashing my head into my keyboard
    */

    /* const posts = await UserPost.findAll({
       attributes: [],
       where: {
         userId: [authArr]
       },
       include: {
         model: Post,
         attributes: ["id", "likes", "popularity", "reads", "tags", "text",],
       },
       order: [[Post, sortBy, direction]],
     });
     console.log(JSON.stringify(posts, null, 2));
     */
    
    // Retrieve all posts from users in the query param
    const getPostIds = await UserPost.findAll({
      attributes: ['postId'],
      where: {
        userId: {
          [Op.in]: authArr,
        },
      },
    });

    // turn the returned data into an array
    const data = getPostIds.map((n) => n['postId']);

    // retrieve said posts
    const posts = await Post.findAll({
      attributes: ['id', 'likes', 'popularity', 'reads', 'tags', 'text'],
      where: {
        id: {
          [Op.in]: data,
        },
      },
      order: [[sortBy, direction]],
    });
    console.log(JSON.stringify(posts, null, 2));

    res.json({ posts: posts });
  } catch (err) {
    next(err);
  }
});

router.patch('/:postId', async (req, res, next) => {
  try {
    //Auth
    if (!req.user) return res.sendStatus(401);

    const { authorIds, text, tags } = req.body;
    // get the post to update
    const post = await Post.getPostById(req.params.postId);

    // make changes if there is a field
    if (authorIds) post.authorIds = authorIds;
    if (text) post.text = text;
    if (tags) post.tags = tags.join(',');

    await post.save();

    res.json({ Post: post });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
