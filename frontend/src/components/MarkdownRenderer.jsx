import React from 'react';
// 如果需要更复杂的Markdown解析，可以引入:
// import { marked } from 'marked'; // 需要 npm install marked
// import DOMPurify from 'dompurify'; // 需要 npm install dompurify，用于XSS防护

export const MarkdownRenderer = ({ content }) => {
  if (!content) return null;
  
  // 简单实现: 将Markdown文本按段落和换行显示，并应用Tailwind Typography样式
  // 使用 Tailwind Typography 插件的 prose 类来美化HTML内容
  // 注意：这个实现不会解析复杂的Markdown语法，如标题、列表、代码块等。
  // 它主要依赖于后端返回的文本已经是某种结构化的（例如，通过换行符分隔）。
  
  // 若要使用 marked + DOMPurify (更推荐的完整实现):
  // 
  // useEffect(() => {
  //   marked.setOptions({
  //     gfm: true, // Enable GitHub Flavored Markdown
  //     breaks: true, // Treat newlines as <br>
  //   });
  // }, []);
  // 
  // const rawMarkup = marked.parse(content || '');
  // const cleanMarkup = DOMPurify.sanitize(rawMarkup);
  // return (
  //   <div 
  //     className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none" 
  //     dangerouslySetInnerHTML={{ __html: cleanMarkup }} 
  //   />
  // );
  
  // 当前采用简单的直接渲染方式，依赖后端文本格式和CSS
  // 确保后端返回的文本中的换行符 (\n) 被正确处理成HTML换行
  return (
    <div className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl max-w-none whitespace-pre-wrap">
      {content}
    </div>
  );
};

export default MarkdownRenderer;
