import CategoryPage from '../pages/CategoryPage';
import HomePage from '../pages/HomePage';

export default function getRoutes(categories) {
  return [
    {
      path: '/',
      element: <HomePage categories={categories} />
    },
    {
      path: '/category/:categoryId',
      element: <CategoryPage categories={categories.filter((category) => category.id)} />
    }
  ];
}
