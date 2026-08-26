// Initialize Supabase Client
const SUPABASE_URL = 'https://zzvzyrsmpuljvmmqicko.supabase.co';
const SUPABASE_KEY = 'sb_publishable_COutYhokKw6asipcSX1XTg_2QSMochC';
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ADMIN SECURITY CHECK:
const urlParams = new URLSearchParams(window.location.search);
const isAdmin = urlParams.get('admin') === 'true' || localStorage.getItem('isAdmin') === 'true';

if (isAdmin) {
  localStorage.setItem('isAdmin', 'true'); // Save admin access in local browser storage
  const adminBox = document.getElementById('admin-post-box');
  if (adminBox) adminBox.style.display = 'block';
}

// READ: Fetch all posts ordered by newest first
async function loadPosts() {
  const container = document.getElementById('feed-container');

  const { data: posts, error } = await supabaseClient
    .from('posts')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    container.innerHTML = '<p style="text-align:center;">Error loading posts.</p>';
    return;
  }

  if (!posts || posts.length === 0) {
    container.innerHTML = '<p style="text-align:center;">No posts yet.</p>';
    return;
  }

  container.innerHTML = posts.map(post => `
    <article class="post-card">
      <div class="post-header">
        <img src="${post.avatar || 'img/ditto.png'}" alt="${post.author}" class="post-avatar" />
        <div class="post-user-info">
          <span class="post-author">${post.author}</span>
          <span class="post-date" data-timestamp="${post.created_at}">Loading...</span>
        </div>
        ${isAdmin ? `<button onclick="deletePost(${post.id})" style="margin-left:auto; background:none; border:none; color:#ef4444; cursor:pointer;" title="Delete post">🗑️</button>` : ''}
      </div>
      <div class="post-body">
        <p>${post.text}</p>
        ${post.image ? `<img src="${post.image}" alt="Post Image" class="post-image" />` : ''}
      </div>
    </article>
  `).join('');

  updatePostDates();
}

// CREATE: Insert a new post
document.getElementById('submit-post-btn')?.addEventListener('click', async () => {
  const textInput = document.getElementById('post-input');
  const imageInput = document.getElementById('image-input');

  if (!textInput.value.trim()) return;

  const { error } = await supabaseClient.from('posts').insert([
    {
      author: 'Acuy123',
      avatar: 'img/ditto.png',
      text: textInput.value,
      image: imageInput.value || null
    }
  ]);

  if (error) {
    console.error('Error publishing post:', error);
    alert('Failed to publish post. Make sure RLS policies allow insert!');
  } else {
    textInput.value = '';
    imageInput.value = '';
    loadPosts(); 
  }
});

// DELETE: Remove post by ID
async function deletePost(id) {
  if (!confirm('Are you sure you want to delete this post?')) return;

  const { error } = await supabaseClient.from('posts').delete().eq('id', id);
  if (error) {
    console.error('Error deleting post:', error);
  } else {
    loadPosts();
  }
}

// Function to calculate relative timestamps
function updatePostDates() {
  const postDates = document.querySelectorAll('.post-date[data-timestamp]');
  const now = new Date();

  postDates.forEach(el => {
    const rawTime = el.getAttribute('data-timestamp');
    if (!rawTime || rawTime === 'undefined') return;

    const postTime = new Date(rawTime);
    const diffInSeconds = Math.floor((now - postTime) / 1000);

    if (isNaN(diffInSeconds) || diffInSeconds < 0) {
      el.textContent = "Just now";
      return;
    }

    if (diffInSeconds < 60) {
      el.textContent = `${diffInSeconds}s ago`;
    } 
    else if (diffInSeconds < 3600) {
      const mins = Math.floor(diffInSeconds / 60);
      el.textContent = `${mins}m ago`;
    } 
    else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      el.textContent = `${hours}h ago`;
    } 
    else if (diffInSeconds < 604800) {
      const days = Math.floor(diffInSeconds / 86400);
      el.textContent = `${days}d ago`;
    }
    else if (diffInSeconds < 2628000) {
      const weeks = Math.floor(diffInSeconds / 604800);
      el.textContent = `${weeks}w ago`;
    }
    else if (diffInSeconds < 31536000) { 
      const months = Math.floor(diffInSeconds / 2628000);
      el.textContent = `${months}mo ago`;
    }
    else {
      const years = Math.floor(diffInSeconds / 31536000);
      el.textContent = `${years}y ago`;
    }
  });
}

// REALTIME LOBBY SYNC: Auto-update feed when database changes
supabaseClient
  .channel('public:posts')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, loadPosts)
  .subscribe();

// Run initial load & start timestamp interval
loadPosts();
setInterval(updatePostDates, 1000);